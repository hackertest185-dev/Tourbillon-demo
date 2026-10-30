namespace backend.Models;

public sealed class StoreOrderItem
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public StoreOrder Order { get; set; } = null!;
    public int? WatchId { get; set; }
    public Watch? Watch { get; set; }
    public string WatchName { get; set; } = string.Empty;
    public string? BrandName { get; set; }
    public string? WatchImage { get; set; }
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }
}
