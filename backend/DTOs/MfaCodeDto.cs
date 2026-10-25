using System.ComponentModel.DataAnnotations;

namespace backend.DTOs;

public sealed class MfaCodeDto
{
    [Required]
    [StringLength(8, MinimumLength = 6)]
    public string Code { get; set; } = string.Empty;
}
