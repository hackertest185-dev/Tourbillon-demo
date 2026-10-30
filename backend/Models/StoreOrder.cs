namespace backend.Models;

public sealed class StoreOrder
{
    public int Id { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public int? UserId { get; set; }
    public User? User { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerEmail { get; set; } = string.Empty;
    public string WhatsAppNumber { get; set; } = string.Empty;
    public string Status { get; set; } = "pending_contact";
    public string PaymentStatus { get; set; } = "unpaid";
    public decimal Subtotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public string Currency { get; set; } = "USD";
    public string? DiscountCode { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ContactConfirmedAt { get; set; }
    public DateTime? PaidAt { get; set; }
    public DateTime? DeliveredAt { get; set; }
    public ICollection<StoreOrderItem> Items { get; set; } = new List<StoreOrderItem>();
}
