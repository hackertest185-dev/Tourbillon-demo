// A reply may only state figures the watches it names can defend.
//
// Grading 36 held-out replies found six claiming a spec the cards do not carry: "65+ hours power
// reserve" for a movement with 45, an integrated bracelet on a watch sold on leather. Every other
// check in the concierge asks whether a name was allowed; this one asks whether the sentence about
// it is true. The risk runs the other way too — a check that fires on ordinary advice would push
// every reply down to deterministic wording, so most of these tests are about what it leaves alone.
using backend.Services;

namespace backend.Tests.Services;

public class SpecClaimTests
{
    private static List<string> Context() =>
    [
        "Watch \"Omega Seamaster 210.30.42.20.01.001 Diver 300M\" (Slug: omega-seamaster-210): Brand Omega (Slug: omega); "
        + "Collection Seamaster (Slug: omega-seamaster); Price $10,525; Description A diver; "
        + "Specs Stainless steel; 42 mm; water resistance 300 m; Black dial; Automatic; power reserve 55 hours; Hours, Minutes, Date; Steel bracelet",
        "Watch \"Patek Philippe Calatrava 6119R-001\" (Slug: patek-calatrava-6119r): Brand Patek Philippe (Slug: patek-philippe); "
        + "Collection Calatrava (Slug: patek-philippe-calatrava); Price $38,900; Description A dress watch; "
        + "Specs Rose gold; 39 mm; water resistance 30 m; Silver dial; Manual-winding; power reserve 65 hours; Hours, Minutes, Small seconds; Alligator leather",
    ];

    [Fact]
    public void APowerReserveTheMovementDoesNotHaveIsRejected()
    {
        // The exact shape the reply judge caught: a real watch, a figure from nowhere.
        var claim = ChatService.UnsupportedSpecClaim(
            "The Calatrava 6119R-001 runs 80 hours on a single wind.", Context());

        Assert.Equal("80 hours", claim);
    }

    [Fact]
    public void AFigureTheRecordCarriesPasses()
    {
        Assert.Null(ChatService.UnsupportedSpecClaim(
            "The Seamaster 210.30.42.20.01.001 is 42 mm with 300 m of water resistance and 55 hours of reserve.",
            Context()));
    }

    [Fact]
    public void APriceIsCheckedExactly()
    {
        Assert.Null(ChatService.UnsupportedSpecClaim(
            "The Calatrava 6119R-001 is $38,900.", Context()));
        Assert.Equal("$12,000", ChatService.UnsupportedSpecClaim(
            "The Calatrava 6119R-001 is $12,000.", Context()));
    }

    [Fact]
    public void AdviceWithNoWatchNamedIsLeftAlone()
    {
        // The advisor persona exists to say things like this, and none of it is a claim about a
        // catalogue record.
        Assert.Null(ChatService.UnsupportedSpecClaim(
            "For a dress watch I would stay under 40 mm, and 100 m of water resistance is plenty for daily wear.",
            Context()));
    }

    [Fact]
    public void AHedgedFigureBesideAWatchIsAJudgementNotAClaim()
    {
        Assert.Null(ChatService.UnsupportedSpecClaim(
            "The Calatrava 6119R-001 sits under 40 mm, which is why it disappears under a cuff.",
            Context()));
    }

    [Fact]
    public void ARoundedMillimetreIsStillTheSameCase()
    {
        // 39 mm written as 40 mm in passing is prose, not a wrong number worth failing a draft for.
        Assert.Null(ChatService.UnsupportedSpecClaim(
            "The Calatrava 6119R-001 is a 40 mm dress watch.", Context()));
    }

    [Fact]
    public void AFigureIsCheckedAgainstTheWatchTheSentenceNames()
    {
        // 55 hours belongs to the Seamaster; saying it of the Calatrava is still wrong.
        Assert.Equal("55 hours", ChatService.UnsupportedSpecClaim(
            "The Calatrava 6119R-001 holds 55 hours.", Context()));
    }

    [Fact]
    public void OrdinaryNumbersInProseAreNotClaims()
    {
        Assert.Null(ChatService.UnsupportedSpecClaim(
            "The Calatrava 6119R-001 draws on a shape Patek Philippe has built since the 1930s, and two of its hands are blued.",
            Context()));
    }

    [Fact]
    public void AFigureInsideTheWatchesOwnNameIsNotAClaim()
    {
        // Some names carry the size: quoting the name back is not a statement about the record.
        var context = new List<string>
        {
            "Watch \"F.P.Journe lineSport elegante 40mm Titalyt\" (Slug: fp-journe-elegante-40mm): Brand F.P.Journe; "
            + "Collection lineSport; Price $22,000; Description A sports watch; Specs Titalyt; Quartz",
        };

        Assert.Null(ChatService.UnsupportedSpecClaim(
            "The lineSport elegante 40mm Titalyt is the one to wear daily.", context));
    }

    [Fact]
    public void AReferenceIsNotASourceOfFigures()
    {
        // "210.30.42.20.01.001" is not evidence that the watch is 30 m water resistant.
        var context = new List<string>
        {
            "Watch \"Omega Seamaster 210.30.42.20.01.001 Diver 300M\" (Slug: omega-seamaster-210): Brand Omega; "
            + "Collection Seamaster; Price $10,525; Description A diver; Specs Stainless steel; 42 mm; water resistance 300 m",
        };

        Assert.Equal("20 hours", ChatService.UnsupportedSpecClaim(
            "The Seamaster 210.30.42.20.01.001 holds 20 hours of reserve.", context));
    }

    [Fact]
    public void NoContextMeansNothingToCheck()
    {
        Assert.Null(ChatService.UnsupportedSpecClaim("Anything at all, 99 mm wide.", []));
    }

    // -- Figures are checked against the spec they name -------------------------------------------

    [Fact]
    public void A_figure_is_checked_against_its_own_unit()
    {
        // The Seamaster is 300 m water resistant with 55 hours of reserve. "300 hours" used to pass
        // because some figure on the record was 300.
        Assert.Equal("300 hours", ChatService.UnsupportedSpecClaim(
            "The Seamaster 210.30.42.20.01.001 keeps going for 300 hours.", Context()));
    }

    [Fact]
    public void A_plus_is_a_floor_the_record_has_to_reach()
    {
        // The reply judge's own example: "65+ hours" for a movement that holds less.
        Assert.Equal("65+ hours", ChatService.UnsupportedSpecClaim(
            "The Seamaster 210.30.42.20.01.001 offers 65+ hours of reserve.", Context()));
        Assert.Null(ChatService.UnsupportedSpecClaim(
            "The Calatrava 6119R-001 offers 65+ hours of reserve.", Context()));
    }

    // -- Categories: what the watch is made of, shows and wears -------------------------------------

    [Fact]
    public void A_bracelet_on_a_watch_sold_on_leather_is_caught()
    {
        Assert.Equal("integrated bracelet", ChatService.UnsupportedSpecClaim(
            "The Calatrava 6119R-001 sits on an integrated bracelet.", Context()));
        Assert.Null(ChatService.UnsupportedSpecClaim(
            "The Seamaster 210.30.42.20.01.001 comes on a bracelet.", Context()));
    }

    [Fact]
    public void A_dial_the_record_does_not_describe_is_caught()
    {
        Assert.Equal("openworked dial", ChatService.UnsupportedSpecClaim(
            "The Calatrava 6119R-001 has an openworked dial.", Context()));
        Assert.Null(ChatService.UnsupportedSpecClaim(
            "The Calatrava 6119R-001 has a silver dial.", Context()));
    }

    [Fact]
    public void A_case_metal_the_record_does_not_carry_is_caught()
    {
        Assert.Equal("white gold", ChatService.UnsupportedSpecClaim(
            "The white gold Calatrava 6119R-001 is the quiet choice.", Context()));
        Assert.Null(ChatService.UnsupportedSpecClaim(
            "The rose gold Calatrava 6119R-001 is the quiet choice.", Context()));
    }

    [Fact]
    public void A_complication_the_movement_does_not_have_is_caught()
    {
        Assert.Equal("moon phase", ChatService.UnsupportedSpecClaim(
            "The Calatrava 6119R-001 adds a moon phase at six.", Context()));
        Assert.Null(ChatService.UnsupportedSpecClaim(
            "The Seamaster 210.30.42.20.01.001 shows the date.", Context()));
    }

    [Fact]
    public void A_winding_the_record_contradicts_is_caught()
    {
        Assert.Equal("automatic", ChatService.UnsupportedSpecClaim(
            "The Calatrava 6119R-001 is an automatic.", Context()));
        Assert.Null(ChatService.UnsupportedSpecClaim(
            "The Calatrava 6119R-001 is hand-wound.", Context()));
    }

    [Fact]
    public void A_category_the_record_is_silent_on_is_not_contradicted()
    {
        // No strap and no functions on this record: silence is not evidence against the sentence.
        var context = new List<string>
        {
            "Watch \"Omega Seamaster 210.30.42.20.01.001 Diver 300M\" (Slug: omega-seamaster-210): Brand Omega; "
            + "Collection Seamaster; Price $10,525; Description A diver; Specs Stainless steel; 42 mm",
        };
        Assert.Null(ChatService.UnsupportedSpecClaim(
            "The Seamaster 210.30.42.20.01.001 comes on rubber strap and has a chronograph.", context));
    }

    [Fact]
    public void A_negated_or_general_mention_is_not_a_claim()
    {
        Assert.Null(ChatService.UnsupportedSpecClaim(
            "Unlike a chronograph, the Calatrava 6119R-001 keeps its dial clean.", Context()));
        Assert.Null(ChatService.UnsupportedSpecClaim(
            "The Calatrava 6119R-001 has no date, which some people prefer.", Context()));
        Assert.Null(ChatService.UnsupportedSpecClaim(
            "An automatic suits daily wear, and a moon phase is a pleasant extra.", Context()));
    }

    [Theory]
    [InlineData("The Calatrava 6119R-001 has no chronograph to clutter the dial.")]
    [InlineData("The Calatrava 6119R-001 is rose gold rather than white gold.")]
    [InlineData("The Calatrava 6119R-001 still works if you want a bracelet later.")]
    [InlineData("Pair the Calatrava 6119R-001 with a rubber strap for summer.")]
    public void A_mention_the_sentence_denies_or_suggests_is_not_a_claim(string reply)
    {
        // Each names the watch first, so only the words around the mention keep it from being read
        // as a statement about the record.
        Assert.Null(ChatService.UnsupportedSpecClaim(reply, Context()));
    }

    [Fact]
    public void A_name_ending_in_ordinary_words_is_not_named_by_them()
    {
        // Replayed from a stored reply: the Seamaster's name ends "Blue Dial", and "a refined blue
        // dial" about the Grand Seiko had its 100 m checked against the Seamaster's 300 m.
        var context = new List<string>
        {
            "Watch \"Grand Seiko Heritage Collection SBGH295 Soko Frost\" (Slug: gs-sbgh295): Brand Grand Seiko; "
            + "Collection Heritage Collection; Price $10,600; Description ; Specs Stainless steel; 40 mm; water resistance 100 m / 10 bar; Blue dial",
            "Watch \"Omega Seamaster 210.30.42.20.03.001 Diver 300M Blue Dial\" (Slug: omega-210-blue): Brand Omega; "
            + "Collection Seamaster; Price $10,525; Description ; Specs Stainless steel; 42 mm; water resistance 300 m / 30 bar; Blue dial",
        };

        Assert.Null(ChatService.UnsupportedSpecClaim(
            "The SBGH295 Soko Frost pairs a refined blue dial with 100m water resistance.", context));
    }

    [Fact]
    public void A_name_is_recognised_without_its_reference_or_its_capitals()
    {
        // The catalogue writes "MOON"; the reply writes "Moon" and leaves the reference out. The price
        // belongs to the Jaeger-LeCoultre, not to the Seamaster named earlier in the sentence.
        var context = new List<string>
        {
            "Watch \"Omega Seamaster 210.30.42.20.03.001 Diver 300M Blue Dial\" (Slug: omega-210-blue): Brand Omega; "
            + "Collection Seamaster; Price $10,525; Description ; Specs Stainless steel; 42 mm",
            "Watch \"Jaeger-LeCoultre Master Ultra Thin Master Ultra Thin MOON Q1368430\" (Slug: jlc-q1368430): Brand Jaeger-LeCoultre; "
            + "Collection Master Ultra Thin; Price $12,600; Description ; Specs Stainless steel; 39 mm",
        };

        Assert.Null(ChatService.UnsupportedSpecClaim(
            "The Seamaster Diver 300M Blue Dial is $10,525, and the Jaeger-LeCoultre Master Ultra Thin Moon is $12,600.",
            context));
    }

    [Fact]
    public void A_figure_inside_a_reference_is_not_a_measurement()
    {
        var context = new List<string>
        {
            "Watch \"Frederique Constant Manufacture FC-760DG4H6 Chronograph\" (Slug: fc-760dg4h6): Brand Frederique Constant; "
            + "Collection Manufacture; Price $4,995; Description ; Specs Stainless steel; 42 mm; power reserve 42 hours",
        };

        Assert.Null(ChatService.UnsupportedSpecClaim(
            "The FC-760DG4H6 Chronograph has a sporty green dial.", context));
    }

    [Fact]
    public void A_gold_detail_is_not_a_gold_case()
    {
        Assert.Null(ChatService.UnsupportedSpecClaim(
            "The Seamaster 210.30.42.20.01.001 has gold-toned hands against its black dial.", Context()));
    }
}
