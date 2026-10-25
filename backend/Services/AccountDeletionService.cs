// This service implements secure account deletion with password verification.
using backend.Models;
using backend.Database;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace backend.Services;

public class AccountDeletionService : IAccountDeletionService
{
    private readonly UserManager<User> _userManager;
    private readonly SignInManager<User> _signInManager;
    private readonly TourbillonContext _context;
    private readonly ILogger<AccountDeletionService> _logger;

    public AccountDeletionService(
        UserManager<User> userManager,
        SignInManager<User> signInManager,
        TourbillonContext context,
        ILogger<AccountDeletionService> logger)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _context = context;
        _logger = logger;
    }

    public async Task<(bool success, string message)> DeleteAccountAsync(string userId, DeleteAccountDto deleteDto)
    {
        try
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return (false, "User not found");
            }

            // Verify current password is provided
            if (string.IsNullOrEmpty(deleteDto.CurrentPassword))
            {
                return (false, "Current password is required to delete account");
            }

            // Verify current password is correct
            var isCurrentPasswordValid = await _userManager.CheckPasswordAsync(user, deleteDto.CurrentPassword);
            if (!isCurrentPasswordValid)
            {
                return (false, "Current password is incorrect");
            }

            // Verify password confirmation matches
            if (deleteDto.CurrentPassword != deleteDto.ConfirmPassword)
            {
                return (false, "Password confirmation does not match");
            }

            // Identity only cascades its own tables. Delete the account-owned records
            // explicitly so database foreign keys cannot leave a user unable to close
            // their account after saving a watch, booking an appointment, or enquiring.
            await using var transaction = await _context.Database.BeginTransactionAsync();
            var numericUserId = user.Id;
            var collectionIds = _context.UserCollections
                .Where(collection => collection.UserId == numericUserId)
                .Select(collection => collection.Id);

            await _context.UserCollectionWatches
                .Where(membership => collectionIds.Contains(membership.UserCollectionId))
                .ExecuteDeleteAsync();
            await _context.UserCollections.Where(collection => collection.UserId == numericUserId).ExecuteDeleteAsync();
            await _context.UserFavourites.Where(favourite => favourite.UserId == numericUserId).ExecuteDeleteAsync();
            await _context.UserTasteProfiles.Where(profile => profile.UserId == numericUserId).ExecuteDeleteAsync();
            await _context.UserBrowsingEvents.Where(eventItem => eventItem.UserId == numericUserId).ExecuteDeleteAsync();
            await _context.ContactInquiries.Where(inquiry => inquiry.UserId == numericUserId).ExecuteDeleteAsync();
            await _context.Appointments.Where(appointment => appointment.UserId == numericUserId).ExecuteDeleteAsync();
            await _context.RegisterInterests.Where(interest => interest.UserId == numericUserId).ExecuteDeleteAsync();

            // Delete the identity record after its application-owned dependants.
            var result = await _userManager.DeleteAsync(user);
            if (!result.Succeeded)
            {
                await transaction.RollbackAsync();
                var errors = result.Errors.Select(e => e.Description).ToList();
                var errorMessage = string.Join(", ", errors);
                return (false, errorMessage);
            }

            await transaction.CommitAsync();

            // Sign out the user after account deletion
            await _signInManager.SignOutAsync();

            _logger.LogInformation("Account deleted successfully for userId: {UserId}", userId);
            return (true, "Account deleted successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting account for userId: {UserId}", userId);
            return (false, "An unexpected error occurred during account deletion.");
        }
    }
}
