import { query } from "@/lib/db";

export interface ProductReviewItem {
  id: number;
  product_id: number;
  store_id: number;
  customer_id: number;
  customer_name: string;
  order_id?: number | null;
  rating: number;
  review_text?: string | null;
  created_at: string;
  seller_reply?: string | null;
  seller_replied_at?: string | null;
}

export interface StoreReviewItem {
  id: number;
  store_id: number;
  customer_id: number;
  customer_name: string;
  rating: number;
  review_text?: string | null;
  reply_text?: string | null;
  replied_at?: string | null;
  created_at: string;
}

export class ReviewRepository {
  /**
   * Check if a user purchased a specific product in a completed/paid order
   */
  static async verifyProductPurchase(
    productId: number,
    userId: number,
    orderId?: number
  ): Promise<boolean> {
    const sql = orderId
      ? `SELECT oi.id
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         WHERE oi.product_id = ? AND o.id = ? AND (o.user_id = ? OR o.payment_status = 'Paid')
         LIMIT 1`
      : `SELECT oi.id
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         WHERE oi.product_id = ? AND o.user_id = ? AND o.payment_status = 'Paid'
         LIMIT 1`;

    const params = orderId ? [productId, orderId, userId] : [productId, userId];
    const rows = await query<any[]>(sql, params);
    return rows.length > 0;
  }

  /**
   * Check if user already reviewed a product for an order
   */
  static async hasUserReviewedProduct(
    productId: number,
    userId: number,
    orderId?: number
  ): Promise<{ reviewed: boolean; rating?: number; reviewText?: string }> {
    const sql = orderId
      ? `SELECT id, rating, review_text FROM product_reviews WHERE product_id = ? AND customer_id = ? AND order_id = ? LIMIT 1`
      : `SELECT id, rating, review_text FROM product_reviews WHERE product_id = ? AND customer_id = ? LIMIT 1`;
    const params = orderId ? [productId, userId, orderId] : [productId, userId];
    const rows = await query<any[]>(sql, params);
    if (rows.length > 0) {
      return {
        reviewed: true,
        rating: rows[0].rating,
        reviewText: rows[0].review_text,
      };
    }
    return { reviewed: false };
  }

  /**
   * Create a product review
   */
  static async createProductReview(data: {
    productId: number;
    storeId: number;
    customerId: number;
    orderId?: number | null;
    rating: number;
    reviewText?: string | null;
  }): Promise<number> {
    const rating = Math.max(1, Math.min(5, Math.round(data.rating)));

    // Upsert or insert review
    const res = await query<{ insertId: number }>(
      `INSERT INTO product_reviews (product_id, store_id, customer_id, order_id, rating, review_text)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        data.productId,
        data.storeId,
        data.customerId,
        data.orderId || null,
        rating,
        data.reviewText ? data.reviewText.trim() : null,
      ]
    );

    return res.insertId;
  }

  /**
   * List reviews for a product with customer names
   */
  static async listProductReviews(
    productId: number,
    limit: number = 20,
    offset: number = 0
  ): Promise<ProductReviewItem[]> {
    const rows = await query<any[]>(
      `SELECT pr.*, COALESCE(u.name, 'Customer') AS customer_name
       FROM product_reviews pr
       LEFT JOIN users u ON u.id = pr.customer_id
       WHERE pr.product_id = ?
       ORDER BY pr.created_at DESC
       LIMIT ? OFFSET ?`,
      [productId, limit, offset]
    );

    return rows.map((r) => ({
      id: r.id,
      product_id: r.product_id,
      store_id: r.store_id,
      customer_id: r.customer_id,
      customer_name: r.customer_name,
      order_id: r.order_id,
      rating: Number(r.rating),
      review_text: r.review_text,
      created_at: r.created_at,
      seller_reply: r.seller_reply,
      seller_replied_at: r.seller_replied_at,
    }));
  }

  /**
   * Get product review statistics (average, total count, star breakdown)
   */
  static async getProductReviewStats(productId: number): Promise<{
    avgRating: number;
    reviewCount: number;
    stars: Record<number, number>;
  }> {
    const [stats] = await query<any[]>(
      `SELECT
         COUNT(*) as total_count,
         AVG(rating) as avg_rating,
         SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as s5,
         SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as s4,
         SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as s3,
         SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as s2,
         SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as s1
       FROM product_reviews
       WHERE product_id = ?`,
      [productId]
    );

    const count = Number(stats?.total_count || 0);
    const avg = count > 0 ? Number(Number(stats?.avg_rating || 0).toFixed(1)) : 0;

    return {
      avgRating: avg,
      reviewCount: count,
      stars: {
        5: Number(stats?.s5 || 0),
        4: Number(stats?.s4 || 0),
        3: Number(stats?.s3 || 0),
        2: Number(stats?.s2 || 0),
        1: Number(stats?.s1 || 0),
      },
    };
  }

  /**
   * Check if user already reviewed a store
   */
  static async hasUserReviewedStore(
    storeId: number,
    userId: number
  ): Promise<{ reviewed: boolean; rating?: number; reviewText?: string }> {
    const rows = await query<any[]>(
      `SELECT id, rating, review_text FROM store_reviews WHERE store_id = ? AND customer_id = ? LIMIT 1`,
      [storeId, userId]
    );
    if (rows.length > 0) {
      return {
        reviewed: true,
        rating: rows[0].rating,
        reviewText: rows[0].review_text,
      };
    }
    return { reviewed: false };
  }

  /**
   * Create or update a store review and recalculate store rating_avg and rating_count
   */
  static async createStoreReview(data: {
    storeId: number;
    customerId: number;
    rating: number;
    reviewText?: string | null;
  }): Promise<number> {
    const rating = Math.max(1, Math.min(5, Math.round(data.rating)));

    // Insert or update store review
    const res = await query<{ insertId: number }>(
      `INSERT INTO store_reviews (store_id, customer_id, rating, review_text)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE rating = VALUES(rating), review_text = VALUES(review_text), created_at = NOW()`,
      [
        data.storeId,
        data.customerId,
        rating,
        data.reviewText ? data.reviewText.trim() : null,
      ]
    );

    // Recalculate store average rating & count
    const [calc] = await query<any[]>(
      `SELECT AVG(rating) as avg_rating, COUNT(*) as review_count FROM store_reviews WHERE store_id = ?`,
      [data.storeId]
    );

    const avgRating = Number(Number(calc?.avg_rating || 5.0).toFixed(2));
    const reviewCount = Number(calc?.review_count || 0);

    await query(
      `UPDATE stores SET rating_avg = ?, rating_count = ? WHERE id = ?`,
      [avgRating, reviewCount, data.storeId]
    );

    return res.insertId || 1;
  }

  /**
   * List reviews for a store
   */
  static async listStoreReviews(
    storeId: number,
    limit: number = 20,
    offset: number = 0
  ): Promise<StoreReviewItem[]> {
    const rows = await query<any[]>(
      `SELECT sr.*, COALESCE(u.name, 'Customer') as customer_name
       FROM store_reviews sr
       LEFT JOIN users u ON u.id = sr.customer_id
       WHERE sr.store_id = ?
       ORDER BY sr.created_at DESC
       LIMIT ? OFFSET ?`,
      [storeId, limit, offset]
    );

    return rows.map((r) => ({
      id: r.id,
      store_id: r.store_id,
      customer_id: r.customer_id,
      customer_name: r.customer_name,
      rating: Number(r.rating),
      review_text: r.review_text,
      reply_text: r.reply_text,
      replied_at: r.replied_at,
      created_at: r.created_at,
    }));
  }

  /**
   * Get all reviews written by a user for an order (both products and store)
   */
  static async getOrderReviewsForUser(
    orderId: number,
    userId: number
  ): Promise<{
    productReviews: Record<number, { rating: number; reviewText: string | null }>;
    storeReview: { reviewed: boolean; rating?: number; reviewText?: string | null };
  }> {
    // 1. Get product reviews for this order
    const pRows = await query<any[]>(
      `SELECT product_id, rating, review_text FROM product_reviews WHERE order_id = ? AND customer_id = ?`,
      [orderId, userId]
    );
    const productReviews: Record<number, { rating: number; reviewText: string | null }> = {};
    for (const r of pRows) {
      productReviews[r.product_id] = {
        rating: Number(r.rating),
        reviewText: r.review_text,
      };
    }

    // 2. Find store_id from order
    const [orderRow] = await query<any[]>(
      `SELECT store_id FROM orders WHERE id = ? LIMIT 1`,
      [orderId]
    );
    let storeReview: { reviewed: boolean; rating?: number; reviewText?: string | null } = { reviewed: false };
    if (orderRow?.store_id) {
      const sResult = await this.hasUserReviewedStore(orderRow.store_id, userId);
      storeReview = {
        reviewed: sResult.reviewed,
        rating: sResult.rating,
        reviewText: sResult.reviewText,
      };
    }

    return { productReviews, storeReview };
  }
}
