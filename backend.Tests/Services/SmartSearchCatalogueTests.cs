// Tests for the model-free Smart Search path. Strict mocks on the HTTP factory and the classifier
// make any model call fail the test, which is the property this path exists to guarantee.
using backend.Database;
using backend.Models;
using backend.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace backend.Tests.Services;

public class SmartSearchCatalogueTests
{
    private static readonly IStorageService Storage = new TestStorageService();

    private sealed class FixedLexicalSearch(params int[] ids) : ILexicalWatchSearch
    {
        public Task<IReadOnlyList<Bm25Hit>> SearchAsync(string query, int limit, CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<Bm25Hit>>(ids.Select((id, i) => new Bm25Hit(id, 10.0 - i)).Take(limit).ToList());
    }

    private static TourbillonContext SeededContext()
    {
        var options = new DbContextOptionsBuilder<TourbillonContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var context = new TestTourbillonContext(options);
        context.Brands.Add(new Brand { Id = 1, Name = "Omega", Slug = "omega" });
        context.Watches.AddRange(
            new Watch { Id = 1, Name = "A1", Slug = "a1", BrandId = 1, CurrentPrice = 8_000 },
            new Watch { Id = 2, Name = "A2", Slug = "a2", BrandId = 1, CurrentPrice = 0 },
            new Watch { Id = 3, Name = "A3", Slug = "a3", BrandId = 1, CurrentPrice = 50_000 });
        context.SaveChanges();
        return context;
    }

    private static WatchFinderService CreateService(TourbillonContext context, ILexicalWatchSearch? lexical)
    {
        // Strict: any attempt to create an HTTP client or classify a query throws.
        var httpFactory = new Mock<IHttpClientFactory>(MockBehavior.Strict);
        var classifier = new Mock<IIntentClassifier>(MockBehavior.Strict);
        var deterministic = new Mock<IDeterministicWatchSearchService>();
        return new WatchFinderService(
            httpFactory.Object,
            deterministic.Object,
            context,
            new WatchFilterMapper(),
            new QueryCacheService(context, NullLogger<QueryCacheService>.Instance),
            NullLogger<WatchFinderService>.Instance,
            Storage,
            classifier: classifier.Object,
            lexical: lexical);
    }

    [Fact]
    public async Task An_off_topic_query_returns_nothing_without_asking_a_model()
    {
        using var context = SeededContext();
        var service = CreateService(context, new FixedLexicalSearch(1, 2, 3));

        var result = await service.SearchCatalogueAsync("what's the weather in London");

        Assert.Empty(result.Watches);
        Assert.Equal("no_watch_signal", result.SearchPath);
    }

    [Fact]
    public async Task An_unparsed_watch_query_is_ranked_by_bm25()
    {
        using var context = SeededContext();
        var service = CreateService(context, new FixedLexicalSearch(3, 1, 2));

        var result = await service.SearchCatalogueAsync("a watch with lovely hand finishing");

        Assert.Equal("bm25_fallback", result.SearchPath);
        Assert.Equal(new[] { 3, 1, 2 }, result.Watches.Select(w => w.Id));
    }

    [Fact]
    public async Task Hard_filters_apply_to_the_bm25_ranking_and_drop_price_on_request()
    {
        using var context = SeededContext();
        var service = CreateService(context, new FixedLexicalSearch(3, 1, 2));

        var result = await service.SearchCatalogueAsync("a watch with lovely finishing under 10k");

        // 3 is over budget. 2 is Price on Request: it used to pass every budget, which is how a
        // benchmark brief asking for something under five thousand was answered with a tourbillon
        // whose price is on request. An unknown price cannot satisfy a stated one.
        Assert.Equal(new[] { 1 }, result.Watches.Select(w => w.Id));
        Assert.Equal(10_000m, result.QueryIntent?.MaxPrice);
    }

    [Fact]
    public async Task A_stated_exclusion_drops_the_watches_that_break_it()
    {
        using var context = SeededContext();
        // 1 has a date, 3 does not; both rank above the budget-less 2.
        context.Watches.Single(w => w.Id == 1).Specs = "{\"movement\":{\"functions\":[\"Hours\",\"Instantaneous date\"]}}";
        context.Watches.Single(w => w.Id == 3).Specs = "{\"movement\":{\"functions\":[\"Hours\",\"Minutes\"]}}";
        context.SaveChanges();
        var service = CreateService(context, new FixedLexicalSearch(1, 3));

        var result = await service.SearchCatalogueAsync("I hate date windows");

        // Complications live in the Specs JSON, so no SQL filter reaches them: before this, the
        // benchmark brief was answered with five dated watches.
        Assert.Equal(new[] { 3 }, result.Watches.Select(w => w.Id));
    }

    [Fact]
    public async Task A_budget_with_no_descriptive_word_still_returns_what_fits_it()
    {
        using var context = SeededContext();
        // BM25 matches nothing here, which is the point: the old path ran BM25 on the words first and
        // filtered after, so a query that was only a budget came back empty.
        var service = CreateService(context, new FixedLexicalSearch());

        var result = await service.SearchCatalogueAsync("anything under 10k");

        Assert.Equal(new[] { 1 }, result.Watches.Select(w => w.Id));
        Assert.Equal("filter_rank", result.SearchPath);
    }

    [Fact]
    public async Task Bm25_orders_the_filtered_set_and_what_it_never_matched_still_follows()
    {
        using var context = SeededContext();
        var service = CreateService(context, new FixedLexicalSearch(3));

        var result = await service.SearchCatalogueAsync("a watch with lovely finishing under 60k");

        // Both priced watches satisfy the budget; BM25 ranks the one it matched first, and the other
        // is still an answer to the brief.
        Assert.Equal(new[] { 3, 1 }, result.Watches.Select(w => w.Id));
    }

    [Fact]
    public async Task A_style_named_with_a_brand_ranks_first_without_filtering_the_brand()
    {
        using var context = SeededContext();
        context.Collections.AddRange(
            new Collection { Id = 20, BrandId = 1, Name = "Seamaster", Slug = "seamaster", Styles = ["diver"] },
            new Collection { Id = 21, BrandId = 1, Name = "Constellation", Slug = "constellation", Styles = ["dress"] });
        context.Watches.AddRange(
            new Watch { Id = 10, Name = "D1", Slug = "d1", BrandId = 1, CollectionId = 20, CurrentPrice = 6_000 },
            new Watch { Id = 11, Name = "C1", Slug = "c1", BrandId = 1, CollectionId = 21, CurrentPrice = 5_000 });
        context.SaveChanges();
        // BM25 prefers the dress watch; the brief asked for a diver.
        var service = CreateService(context, new FixedLexicalSearch(11, 10));

        var result = await service.SearchCatalogueAsync("a dive watch from Omega");

        Assert.Equal(10, result.Watches.First().Id);
        // Style inside a brand is a preference: the other Omega watches are still there, behind it.
        Assert.Contains(result.Watches.Concat(result.OtherCandidates), w => w.Id == 11);
    }

    [Fact]
    public async Task A_complication_named_the_filter_bar_s_way_finds_the_catalogue_s_spelling()
    {
        using var context = SeededContext();
        // The catalogue writes "Moon phase"; the parser reads the brief as "Moonphase". Checked against
        // each other directly, every moon phase brief came back empty.
        context.Watches.Single(w => w.Id == 1).Specs = "{\"movement\":{\"functions\":[\"Hours\",\"Moon phase\"]}}";
        context.Watches.Single(w => w.Id == 3).Specs = "{\"movement\":{\"functions\":[\"Hours\",\"Minutes\"]}}";
        context.SaveChanges();
        var service = CreateService(context, new FixedLexicalSearch());

        var result = await service.SearchCatalogueAsync("a moonphase under 60k");

        Assert.Equal(new[] { 1 }, result.Watches.Select(w => w.Id));
    }

    private static void SetCaseMaterials(TourbillonContext context)
    {
        context.Watches.Single(w => w.Id == 1).Specs = "{\"case\":{\"material\":\"18K yellow gold\"}}";
        context.Watches.Single(w => w.Id == 2).Specs = "{\"case\":{\"material\":\"18K white gold\"}}";
        context.Watches.Single(w => w.Id == 3).Specs = "{\"case\":{\"material\":\"Stainless steel\"}}";
        context.SaveChanges();
    }

    [Fact]
    public async Task A_named_gold_is_that_gold_and_not_every_gold()
    {
        using var context = SeededContext();
        SetCaseMaterials(context);
        var service = CreateService(context, new FixedLexicalSearch());

        var result = await service.SearchCatalogueAsync("yellow gold pieces");

        // The parser used to collapse every gold to "Gold", so white gold ranked alongside yellow.
        Assert.Equal(new[] { 1 }, result.Watches.Select(w => w.Id));
    }

    [Fact]
    public async Task Refusing_gold_while_naming_a_gold_refuses_that_gold_too()
    {
        using var context = SeededContext();
        SetCaseMaterials(context);
        var service = CreateService(context, new FixedLexicalSearch());

        var result = await service.SearchCatalogueAsync("watches with no gold case, even white gold");

        // Read as "require gold and exclude gold", this brief used to return nothing at all.
        Assert.Equal(new[] { 3 }, result.Watches.Select(w => w.Id));
    }

    [Theory]
    [InlineData("i can go up to 8 thousand, not a dollar more", new[] { "8", "thousand", "dollar" }, new string[0])]
    [InlineData("no more than 9 grand", new[] { "9", "grand" }, new string[0])]
    [InlineData("blue dial chronograph under 30k", new[] { "30" }, new[] { "blue dial chronograph" })]
    [InlineData("rose gold dress watch, 38mm or smaller", new[] { "38" }, new[] { "rose gold dress watch" })]
    [InlineData("Grand Seiko between 5 and 12 thousand", new[] { "12", "between" }, new[] { "Grand Seiko" })]
    public void The_residual_keeps_the_words_and_drops_the_figures(string query, string[] gone, string[] kept)
    {
        var residual = WatchFinderService.ResidualQuery(query);

        Assert.All(gone, word => Assert.DoesNotMatch($@"(?i)\b{word}\b", residual));
        Assert.All(kept, phrase => Assert.Contains(phrase, residual, StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task No_lexical_match_is_an_empty_result_not_an_error()
    {
        using var context = SeededContext();
        var service = CreateService(context, new FixedLexicalSearch());

        var result = await service.SearchCatalogueAsync("a watch with lovely hand finishing");

        Assert.Empty(result.Watches);
        Assert.Equal("bm25_no_match", result.SearchPath);
    }
}
