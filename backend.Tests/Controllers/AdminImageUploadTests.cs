using System.Text.Json;
using backend.Controllers;
using backend.Database;
using backend.Models;
using backend.Services;
using backend.Tests.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace backend.Tests.Controllers;

public class AdminImageUploadTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task UploadReturnsProviderUrlAndPreservesOriginalBytes(bool existingWatch)
    {
        using var context = TestContextFactory.Create();
        var watch = new Watch
        {
            Name = "QA Reference", Slug = "qa-reference", Image = "/catalogue/original.webp",
            Brand = new Brand { Name = "QA Brand", Slug = "qa-brand" }
        };
        context.Watches.Add(watch);
        await context.SaveChangesAsync();
        var original = Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1cAAAAASUVORK5CYII=");
        byte[]? stored = null;
        var storage = new Mock<IStorageService>();
        storage.Setup(s => s.UploadImageAsync(It.IsAny<Stream>(), It.IsAny<string>(), "watches"))
            .Returns(async (Stream stream, string _, string _) =>
            {
                using var copy = new MemoryStream();
                await stream.CopyToAsync(copy);
                stored = copy.ToArray();
                return ("watches/qa-upload", 123L);
            });
        storage.Setup(s => s.GetPublicUrl("watches/qa-upload", 123))
            .Returns("https://res.cloudinary.com/qa/image/upload/v123/watches/qa-upload");
        using var services = new ServiceCollection().AddSingleton<TourbillonContext>(context)
            .AddSingleton(storage.Object).BuildServiceProvider();
        var controller = new AdminController(null!, null!, null!, null!, null!, null!, null!,
            NullLogger<AdminController>.Instance)
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { RequestServices = services } }
        };
        using var source = new MemoryStream(original);
        var file = new FormFile(source, 0, original.Length, "file", "qa.png");
        var response = existingWatch
            ? await controller.AdminUploadWatchImage(watch.Id, file)
            : await controller.AdminUploadImageTemp(file, "qa-upload");
        var ok = Assert.IsType<OkObjectResult>(response);
        using var json = JsonDocument.Parse(JsonSerializer.Serialize(ok.Value, new JsonSerializerOptions(JsonSerializerDefaults.Web)));
        Assert.Equal("https://res.cloudinary.com/qa/image/upload/v123/watches/qa-upload",
            json.RootElement.GetProperty("imageUrl").GetString());
        Assert.Equal(original, stored);
        if (existingWatch)
        {
            Assert.Equal("watches/qa-upload", watch.Image);
            Assert.Equal(123, watch.ImageVersion);
        }
        storage.Verify(s => s.DeleteImageAsync(It.IsAny<string>()), Times.Never);
    }
}
