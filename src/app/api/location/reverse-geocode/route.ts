import { NextResponse } from "next/server";
import { CAMEROON_CITIES, findNearestCameroonLocation } from "@/lib/cameroon-locations";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const latStr = searchParams.get("lat");
    const lngStr = searchParams.get("lng");

    if (!latStr || !lngStr) {
      return NextResponse.json({ error: "Missing lat or lng query parameters" }, { status: 400 });
    }

    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json({ error: "Invalid coordinates provided" }, { status: 400 });
    }

    let osmData: any = null;
    let bdcData: any = null;

    // 1. Fetch real location from OpenStreetMap Nominatim and BigDataCloud in parallel
    const fetchPromises = [
      (async () => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4000);
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&extratags=1&namedetails=1`,
            {
              headers: {
                "User-Agent": "Bushbuyer-Cameroon-Marketplace/1.0 (support@bushbuyer.com)",
                "Accept-Language": "en,fr",
              },
              signal: controller.signal,
            }
          );
          clearTimeout(timeoutId);
          if (res.ok) osmData = await res.json();
        } catch {
          // ignore
        }
      })(),
      (async () => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3500);
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
            { signal: controller.signal }
          );
          clearTimeout(timeoutId);
          if (res.ok) bdcData = await res.json();
        } catch {
          // ignore
        }
      })(),
    ];

    await Promise.allSettled(fetchPromises);

    // 2. Extract real address components from OSM
    const addr = osmData?.address || {};
    const extraTags = osmData?.extratags || {};

    const osmBusiness =
      osmData?.name ||
      extraTags?.name ||
      extraTags?.brand ||
      addr?.amenity ||
      addr?.shop ||
      addr?.commercial ||
      addr?.office ||
      addr?.tourism ||
      addr?.building ||
      null;

    const osmRoad =
      addr?.road ||
      addr?.pedestrian ||
      addr?.street ||
      addr?.avenue ||
      addr?.boulevard ||
      addr?.footway ||
      addr?.path ||
      null;

    const osmQuarter =
      addr?.suburb ||
      addr?.neighbourhood ||
      addr?.quarter ||
      addr?.residential ||
      addr?.city_district ||
      addr?.village ||
      addr?.hamlet ||
      null;

    let osmCity =
      addr?.city ||
      addr?.town ||
      addr?.municipality ||
      addr?.county ||
      addr?.state_district ||
      null;

    // Clean up city string if it has prefix like "Commune de " or "Arrondissement de "
    if (osmCity) {
      osmCity = osmCity
        .replace(/^(Commune|Arrondissement|Ville|City)\s+(de\s+|d'|of\s+)?/i, "")
        .trim();
    }

    // 3. Extract components from BigDataCloud if OSM is missing anything
    const bdcCity = bdcData?.city || bdcData?.locality || bdcData?.principalSubdivision || null;
    const bdcQuarter = bdcData?.locality || bdcData?.localityInfo?.administrative?.[3]?.name || null;

    // 4. Fallback nearest reference only if both APIs failed
    const nearestRef = findNearestCameroonLocation(lat, lng);

    // 5. Determine ACTUAL Real City
    const realCity =
      osmCity ||
      bdcCity ||
      nearestRef.city.name ||
      "Cameroon";

    // 6. Determine ACTUAL Real Quarter / Area
    let realQuarter =
      osmQuarter ||
      bdcQuarter ||
      (nearestRef.quarter?.name ?? "Centre");

    if (realQuarter && realCity && realQuarter.toLowerCase() === realCity.toLowerCase()) {
      if (osmRoad) {
        realQuarter = osmRoad;
      }
    }

    // 7. Determine Real Physical Street Address
    let realAddress = "";
    if (osmRoad) {
      const houseNum = addr?.house_number ? `#${addr.house_number}, ` : "";
      realAddress = `${houseNum}${osmRoad}${realQuarter && realQuarter !== osmRoad ? `, ${realQuarter}` : ""}`;
    } else if (osmBusiness && osmBusiness !== realQuarter && osmBusiness !== realCity) {
      realAddress = `${osmBusiness}${realQuarter ? `, ${realQuarter}` : ""}`;
    } else if (osmData?.display_name) {
      // Take first 2-3 meaningful parts of the real display name
      const parts = osmData.display_name.split(",").map((s: string) => s.trim());
      realAddress = parts.slice(0, Math.min(parts.length, 3)).join(", ");
    } else if (realQuarter) {
      realAddress = `${realQuarter}, ${realCity}`;
    } else {
      realAddress = `${realCity}, Cameroon`;
    }

    // 8. Determine Real Landmark / Business Reference
    let realLandmark = "";
    if (osmBusiness && osmBusiness !== osmRoad && osmBusiness !== realQuarter) {
      realLandmark = `At / Near ${osmBusiness}${osmRoad ? ` on ${osmRoad}` : ""}`;
    } else if (osmRoad) {
      realLandmark = `Along ${osmRoad}`;
      if (realQuarter && realQuarter !== osmRoad) {
        realLandmark += ` (${realQuarter})`;
      }
    } else if (realQuarter) {
      realLandmark = `In ${realQuarter} area`;
    } else {
      realLandmark = `In ${realCity}`;
    }

    return NextResponse.json({
      success: true,
      data: {
        city: realCity,
        quarter: realQuarter,
        address: realAddress,
        landmark: realLandmark,
        businessName: osmBusiness,
        road: osmRoad,
        region: addr?.state || bdcData?.principalSubdivision || "Cameroon",
        country: addr?.country || bdcData?.countryName || "Cameroon",
        displayName: osmData?.display_name || `${realQuarter}, ${realCity}, Cameroon`,
        actualCoordinates: {
          lat,
          lng,
        },
      },
    });
  } catch (err: any) {
    console.error("Reverse geocoding error:", err);
    return NextResponse.json(
      { error: "Failed to reverse geocode coordinates", message: err?.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { lat, lng } = body;

    if (lat === undefined || lng === undefined) {
      return NextResponse.json({ error: "Missing lat or lng in request body" }, { status: 400 });
    }

    const url = new URL(request.url);
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lng", String(lng));

    return GET(new Request(url.toString(), { method: "GET" }));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
