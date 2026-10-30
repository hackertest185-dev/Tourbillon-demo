using System.Text.Encodings.Web;
using backend.Database;
using backend.DTOs;
using backend.Extensions;
using backend.Models;
using backend.Services;
using Hangfire;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api")]
public sealed class StoreController : ControllerBase
{
    private readonly TourbillonContext _db;
    private readonly UserManager<User> _users;
    private readonly IStorageService _storage;
    private readonly IConfiguration _config;
    private readonly ILogger<StoreController> _logger;

    public StoreController(TourbillonContext db, UserManager<User> users, IStorageService storage, IConfiguration config, ILogger<StoreController> logger)
    {
        _db = db;
        _users = users;
        _storage = storage;
        _config = config;
        _logger = logger;
    }

    [Authorize]
    [HttpGet("cart")]
    public async Task<IActionResult> GetCart()
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized();
        return Ok(await CartQuery(userId.Value));
    }

    [Authorize]
    [HttpPost("cart/items")]
    public async Task<IActionResult> AddCartItem(AddCartItemDto dto)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized();
        var watch = await _db.Watches.AsNoTracking().FirstOrDefaultAsync(w => w.Id == dto.WatchId);
        if (watch == null) return NotFound(new { message = "الساعة دي مش موجودة." });
        if (watch.CurrentPrice <= 0) return BadRequest(new { message = "الساعة دي سعرها عند السؤال ومش متاحة للطلب من السلة." });
        var item = await _db.StoreCartItems.FirstOrDefaultAsync(x => x.UserId == userId && x.WatchId == dto.WatchId);
        var newQuantity = (item?.Quantity ?? 0) + dto.Quantity;
        if (newQuantity > watch.StockQuantity) return Conflict(new { message = "الكمية المطلوبة مش متاحة حاليًا.", available = watch.StockQuantity });
        if (item == null)
            _db.StoreCartItems.Add(new StoreCartItem { UserId = userId.Value, WatchId = dto.WatchId, Quantity = dto.Quantity });
        else { item.Quantity = newQuantity; item.UpdatedAt = DateTime.UtcNow; }
        await _db.SaveChangesAsync();
        return Ok(await CartQuery(userId.Value));
    }

    [Authorize]
    [HttpPut("cart/items/{watchId:int}")]
    public async Task<IActionResult> UpdateCartItem(int watchId, UpdateCartItemDto dto)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized();
        var item = await _db.StoreCartItems.Include(x => x.Watch).FirstOrDefaultAsync(x => x.UserId == userId && x.WatchId == watchId);
        if (item == null) return NotFound();
        if (dto.Quantity > item.Watch.StockQuantity) return Conflict(new { message = "الكمية المطلوبة مش متاحة حاليًا.", available = item.Watch.StockQuantity });
        item.Quantity = dto.Quantity;
        item.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(await CartQuery(userId.Value));
    }

    [Authorize]
    [HttpDelete("cart/items/{watchId:int}")]
    public async Task<IActionResult> RemoveCartItem(int watchId)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized();
        var item = await _db.StoreCartItems.FirstOrDefaultAsync(x => x.UserId == userId && x.WatchId == watchId);
        if (item != null) { _db.StoreCartItems.Remove(item); await _db.SaveChangesAsync(); }
        return Ok(await CartQuery(userId.Value));
    }

    [Authorize]
    [HttpPost("orders")]
    public async Task<IActionResult> CreateOrder(CheckoutOrderDto dto)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized();
        if (!TryNormalizePhone(dto.WhatsAppNumber, out var phone))
            return BadRequest(new { message = "اكتب رقم واتساب بصيغة دولية صحيحة، زي +2010XXXXXXXX." });

        await using var transaction = await _db.Database.BeginTransactionAsync();
        var cart = await _db.StoreCartItems.Include(x => x.Watch).ThenInclude(w => w.Brand)
            .Where(x => x.UserId == userId).OrderBy(x => x.WatchId).ToListAsync();
        if (cart.Count == 0) return BadRequest(new { message = "السلة فاضية." });

        foreach (var item in cart)
        {
            if (item.Watch.CurrentPrice <= 0) return BadRequest(new { message = $"{item.Watch.Name} سعرها عند السؤال ومش متاحة للطلب من السلة." });
            var reserved = await _db.Watches.Where(w => w.Id == item.WatchId && w.StockQuantity >= item.Quantity)
                .ExecuteUpdateAsync(setters => setters.SetProperty(w => w.StockQuantity, w => w.StockQuantity - item.Quantity));
            if (reserved != 1) return Conflict(new { message = $"الكمية المتاحة من {item.Watch.Name} اتغيرت. راجع السلة وجرب تاني." });
        }

        var subtotal = cart.Sum(x => x.Watch.CurrentPrice * x.Quantity);
        DiscountCode? discount = null;
        decimal discountAmount = 0;
        if (!string.IsNullOrWhiteSpace(dto.DiscountCode))
        {
            var normalizedCode = dto.DiscountCode.Trim().ToUpperInvariant();
            discount = await _db.DiscountCodes.AsNoTracking().FirstOrDefaultAsync(x => x.Code == normalizedCode);
            var now = DateTime.UtcNow;
            if (discount == null || !discount.IsActive || (discount.ExpiresAt.HasValue && discount.ExpiresAt.Value <= now)
                || (discount.MaxRedemptions.HasValue && discount.RedemptionCount >= discount.MaxRedemptions.Value))
                return BadRequest(new { message = "كود الخصم مش صالح أو انتهت صلاحيته." });
            var incremented = await _db.DiscountCodes.Where(x => x.Id == discount.Id && x.IsActive
                    && (!x.ExpiresAt.HasValue || x.ExpiresAt > now)
                    && (!x.MaxRedemptions.HasValue || x.RedemptionCount < x.MaxRedemptions.Value))
                .ExecuteUpdateAsync(setters => setters.SetProperty(x => x.RedemptionCount, x => x.RedemptionCount + 1));
            if (incremented != 1) return Conflict(new { message = "كود الخصم خلص أو اتوقف. جرّب من غيره." });
            discountAmount = discount.Kind == "percent"
                ? Math.Round(subtotal * discount.Value / 100m, 2, MidpointRounding.AwayFromZero)
                : Math.Min(discount.Value, subtotal);
        }

        var user = await _users.FindByIdAsync(userId.Value.ToString());
        if (user == null) return Unauthorized();
        var order = new StoreOrder
        {
            OrderNumber = GenerateOrderNumber(),
            UserId = userId,
            CustomerName = string.Join(' ', new[] { user.FirstName, user.LastName }.Where(s => !string.IsNullOrWhiteSpace(s))),
            CustomerEmail = user.Email ?? string.Empty,
            WhatsAppNumber = phone,
            Status = "pending_contact",
            PaymentStatus = "unpaid",
            Subtotal = subtotal,
            DiscountAmount = discountAmount,
            TotalAmount = subtotal - discountAmount,
            DiscountCode = discount?.Code,
            Currency = "USD",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            Items = cart.Select(x => new StoreOrderItem
            {
                WatchId = x.WatchId,
                WatchName = x.Watch.Name,
                BrandName = x.Watch.Brand.Name,
                WatchImage = _storage.GetPublicUrl(x.Watch.Image, x.Watch.ImageVersion),
                UnitPrice = x.Watch.CurrentPrice,
                Quantity = x.Quantity
            }).ToList()
        };
        _db.StoreOrders.Add(order);
        _db.StoreCartItems.RemoveRange(cart);
        await _db.SaveChangesAsync();
        await transaction.CommitAsync();

        var adminEmail = _config["AdminSettings:SeedAdminEmail"];
        if (!string.IsNullOrWhiteSpace(adminEmail))
        {
            try
            {
                var itemLines = string.Join("<br>", order.Items.Select(i => $"{HtmlEncoder.Default.Encode(i.WatchName)} × {i.Quantity} — {i.UnitPrice:C} {order.Currency}"));
                var body = $"<h2>طلب جديد {order.OrderNumber}</h2><p>العميل: {HtmlEncoder.Default.Encode(order.CustomerName)}</p><p>واتساب: {HtmlEncoder.Default.Encode(order.WhatsAppNumber)}</p><p>{itemLines}</p><p>الإجمالي: {order.TotalAmount:N2} {order.Currency}</p><p>الدفع: يدوي وغير مؤكد</p>";
                BackgroundJob.Enqueue<BackgroundEmailService>(x => x.SendAsync(adminEmail, $"طلب جديد {order.OrderNumber}", body));
            }
            catch (Exception ex) { _logger.LogWarning(ex, "Order {OrderNumber} saved but the admin email could not be queued", order.OrderNumber); }
        }
        return Created($"/api/orders/{order.Id}", OrderDto(order));
    }

    [Authorize]
    [HttpGet("orders/mine")]
    public async Task<IActionResult> MyOrders()
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized();
        var orders = await _db.StoreOrders.AsNoTracking().Include(x => x.Items).Where(x => x.UserId == userId)
            .OrderByDescending(x => x.CreatedAt).ToListAsync();
        return Ok(orders.Select(OrderDto));
    }

    [Authorize(Roles = "Admin")]
    [HttpGet("admin/orders")]
    public async Task<IActionResult> AdminOrders()
    {
        var orders = await _db.StoreOrders.AsNoTracking().Include(x => x.Items).OrderByDescending(x => x.CreatedAt).ToListAsync();
        return Ok(new
        {
            orders = orders.Select(OrderDto),
            salesTotal = orders.Where(x => x.Status == "delivered" && x.PaymentStatus == "paid").Sum(x => x.TotalAmount),
            currency = "USD"
        });
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("admin/orders/{id:int}/contact-confirmed")]
    public async Task<IActionResult> ConfirmContact(int id)
    {
        var order = await _db.StoreOrders.FirstOrDefaultAsync(x => x.Id == id);
        if (order == null) return NotFound();
        if (order.Status != "pending_contact") return Conflict(new { message = "الطلب مش في انتظار التواصل." });
        order.Status = "contacted";
        order.ContactConfirmedAt = DateTime.UtcNow;
        order.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { message = "اتسجل إن رسالة واتساب اتبعتت.", order = OrderDto(order) });
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("admin/orders/{id:int}/confirm-delivery")]
    public async Task<IActionResult> ConfirmDelivery(int id)
    {
        var order = await _db.StoreOrders.Include(x => x.Items).FirstOrDefaultAsync(x => x.Id == id);
        if (order == null) return NotFound();
        if (order.Status != "contacted" || order.PaymentStatus != "unpaid")
            return Conflict(new { message = "أكد التواصل الأول، وتأكد من استلام التحويل والتسليم." });
        order.Status = "delivered";
        order.PaymentStatus = "paid";
        order.PaidAt = DateTime.UtcNow;
        order.DeliveredAt = DateTime.UtcNow;
        order.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { message = "اتأكد الدفع والتسليم واتضافت المبيعة.", order = OrderDto(order) });
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("admin/orders/{id:int}/cancel")]
    public async Task<IActionResult> CancelOrder(int id)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync();
        var order = await _db.StoreOrders.Include(x => x.Items).FirstOrDefaultAsync(x => x.Id == id);
        if (order == null) return NotFound();
        if (order.Status is not ("pending_contact" or "contacted")) return Conflict(new { message = "مينفعش نلغي الطلب بالحالة دي." });
        var cancelled = await _db.StoreOrders.Where(x => x.Id == id && (x.Status == "pending_contact" || x.Status == "contacted"))
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.Status, "cancelled").SetProperty(x => x.UpdatedAt, DateTime.UtcNow));
        if (cancelled != 1) return Conflict(new { message = "الطلب اتغيرت حالته. حدّث الصفحة وجرب تاني." });
        foreach (var item in order.Items.Where(x => x.WatchId.HasValue))
            await _db.Watches.Where(w => w.Id == item.WatchId).ExecuteUpdateAsync(s => s.SetProperty(w => w.StockQuantity, w => w.StockQuantity + item.Quantity));
        if (!string.IsNullOrEmpty(order.DiscountCode))
            await _db.DiscountCodes.Where(x => x.Code == order.DiscountCode && x.RedemptionCount > 0)
                .ExecuteUpdateAsync(s => s.SetProperty(x => x.RedemptionCount, x => x.RedemptionCount - 1));
        await transaction.CommitAsync();
        return Ok(new { message = "اتلغى الطلب ورجع المخزون." });
    }

    [Authorize(Roles = "Admin")]
    [HttpGet("admin/discount-codes")]
    public async Task<IActionResult> DiscountCodes() => Ok(await _db.DiscountCodes.AsNoTracking().OrderByDescending(x => x.CreatedAt).ToListAsync());

    [Authorize(Roles = "Admin")]
    [HttpPost("admin/discount-codes")]
    public async Task<IActionResult> CreateDiscountCode(CreateDiscountCodeDto dto)
    {
        var code = dto.Code.Trim().ToUpperInvariant();
        if (dto.Kind == "percent" && dto.Value > 100) return BadRequest(new { message = "نسبة الخصم مينفعش تعدي 100%." });
        if (dto.ExpiresAt.HasValue && dto.ExpiresAt.Value <= DateTime.UtcNow) return BadRequest(new { message = "تاريخ الانتهاء لازم يكون في المستقبل." });
        if (await _db.DiscountCodes.AnyAsync(x => x.Code == code)) return Conflict(new { message = "كود الخصم ده موجود بالفعل." });
        var entity = new DiscountCode { Code = code, Kind = dto.Kind, Value = dto.Value, IsActive = dto.IsActive, MaxRedemptions = dto.MaxRedemptions, ExpiresAt = dto.ExpiresAt?.ToUniversalTime() };
        _db.DiscountCodes.Add(entity);
        await _db.SaveChangesAsync();
        return Created($"/api/admin/discount-codes/{entity.Id}", entity);
    }

    [Authorize(Roles = "Admin")]
    [HttpPatch("admin/discount-codes/{id:int}/active")]
    public async Task<IActionResult> SetDiscountCodeActive(int id, [FromBody] bool active)
    {
        var code = await _db.DiscountCodes.FindAsync(id);
        if (code == null) return NotFound();
        code.IsActive = active;
        await _db.SaveChangesAsync();
        return Ok(code);
    }

    private async Task<object> CartQuery(int userId)
    {
        var items = await _db.StoreCartItems.AsNoTracking().Include(x => x.Watch).ThenInclude(w => w.Brand)
            .Where(x => x.UserId == userId).OrderBy(x => x.CreatedAt).ToListAsync();
        return new
        {
            items = items.Select(x => new
            {
                watchId = x.WatchId,
                x.Quantity,
                name = x.Watch.Name,
                brand = x.Watch.Brand.Name,
                image = _storage.GetPublicUrl(x.Watch.Image, x.Watch.ImageVersion),
                unitPrice = x.Watch.CurrentPrice,
                stockQuantity = x.Watch.StockQuantity,
                lineTotal = x.Watch.CurrentPrice * x.Quantity
            }),
            subtotal = items.Sum(x => x.Watch.CurrentPrice * x.Quantity),
            currency = "USD"
        };
    }

    private static object OrderDto(StoreOrder order) => new
    {
        order.Id,
        order.OrderNumber,
        order.Status,
        order.PaymentStatus,
        order.CustomerName,
        order.CustomerEmail,
        order.WhatsAppNumber,
        order.Subtotal,
        order.DiscountAmount,
        order.TotalAmount,
        order.Currency,
        order.DiscountCode,
        order.CreatedAt,
        order.ContactConfirmedAt,
        order.PaidAt,
        order.DeliveredAt,
        Items = order.Items.Select(i => new { i.WatchId, i.WatchName, i.BrandName, i.WatchImage, i.UnitPrice, i.Quantity })
    };

    private static bool TryNormalizePhone(string input, out string normalized)
    {
        var digits = new string(input.Where(char.IsDigit).ToArray());
        if (digits.StartsWith("00")) digits = digits[2..];
        if (digits.StartsWith("01") && digits.Length == 11) digits = "2" + digits;
        if (digits.Length < 8 || digits.Length > 15) { normalized = string.Empty; return false; }
        normalized = "+" + digits;
        return true;
    }

    private static string GenerateOrderNumber() =>
        $"VLR-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid():N}"[..21].ToUpperInvariant();
}
