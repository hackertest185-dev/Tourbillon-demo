using System.Text.Json;
using backend.Controllers;
using backend.Database;
using backend.DTOs;
using backend.Models;
using backend.Services;
using backend.Tests.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace backend.Tests.Controllers;

public class AdminWatchSerializationTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task TrackedBrandAndCollectionCannotMakeSuccessfulWatchWritesReturnSerializationErrors(bool update)
    {
        using var context = TestContextFactory.Create();
        context.Brands.Add(new Brand { Id = 1, Name = "QA Brand", Slug = "qa-brand" });
        context.Collections.Add(new Collection { Id = 2, BrandId = 1, Name = "QA Collection", Slug = "qa-collection" });
        await context.SaveChangesAsync();
        var storage = new Mock<IStorageService>();
        storage.Setup(s => s.GetPublicUrl(It.IsAny<string>(), It.IsAny<long?>()))
            .Returns((string? image, long? _) => image);
        using var services = new ServiceCollection().AddSingleton<TourbillonContext>(context)
            .AddSingleton(storage.Object).BuildServiceProvider();
        var controller = new AdminController(null!, null!, null!, null!, null!, null!, null!,
            NullLogger<AdminController>.Instance)
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { RequestServices = services } }
        };
        var created = Assert.IsType<OkObjectResult>(await controller.AdminCreateWatch(new CreateWatchDto
        {
            Name = "QA Reference", BrandId = 1, CollectionId = 2, CurrentPrice = 100,
            Image = "qa.webp", Specs = "{}"
        }));
        var saved = Assert.Single(context.Watches);
        // EF has fixed up the relationships: returning this entity would recurse.
        Assert.Contains(saved, saved.Brand.Watches!);
        var result = update
            ? Assert.IsType<OkObjectResult>(await controller.AdminUpdateWatch(saved.Id, new UpdateWatchDto
            {
                Name = "QA Reference", CollectionId = 2, CurrentPrice = 150, Image = "qa.webp", Specs = "{}"
            }))
            : created;
        var serialized = JsonSerializer.Serialize(result.Value, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        using var json = JsonDocument.Parse(serialized);
        var watch = json.RootElement.GetProperty("watch");
        Assert.Equal(saved.Id, watch.GetProperty("id").GetInt32());
        Assert.Equal(update ? 150 : 100, watch.GetProperty("currentPrice").GetDecimal());
        Assert.Equal("qa.webp", watch.GetProperty("imageUrl").GetString());
        Assert.False(watch.TryGetProperty("brand", out _));
    }
}
