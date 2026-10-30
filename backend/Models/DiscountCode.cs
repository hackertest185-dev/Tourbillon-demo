namespace backend.Models;

public sealed class DiscountCode
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Kind { get; set; } = "percent";
    public decimal Value { get; set; }
    public bool IsActive { get; set; } = true;
    public int? MaxRedemptions { get; set; }
    public int RedemptionCount { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
