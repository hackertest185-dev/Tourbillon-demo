using System.ComponentModel.DataAnnotations;

namespace backend.DTOs;

public sealed class AddCartItemDto
{
    [Range(1, int.MaxValue)] public int WatchId { get; set; }
    [Range(1, 10)] public int Quantity { get; set; } = 1;
}

public sealed class UpdateCartItemDto
{
    [Range(1, 10)] public int Quantity { get; set; }
}

public sealed class CheckoutOrderDto
{
    [Required, StringLength(32)] public string WhatsAppNumber { get; set; } = string.Empty;
    [StringLength(48)] public string? DiscountCode { get; set; }
}

public sealed class CreateDiscountCodeDto
{
    [Required, StringLength(48, MinimumLength = 3)] public string Code { get; set; } = string.Empty;
    [Required, RegularExpression("^(percent|fixed)$")] public string Kind { get; set; } = "percent";
    [Range(0.01, 100000000)] public decimal Value { get; set; }
    [Range(1, int.MaxValue)] public int? MaxRedemptions { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public bool IsActive { get; set; } = true;
}
