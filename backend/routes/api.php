<?php

use App\Http\Controllers\Api\AccountLogController;
use App\Http\Controllers\Api\BroadcastMessageController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AdminUserController;
use App\Http\Controllers\Api\BankDetailController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\ManualPaymentController;
use App\Http\Controllers\Api\MessageController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\PurchaseController;
use App\Http\Controllers\Api\SiteSettingController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\UserRoleController;
use App\Http\Controllers\Api\VirtualAccountController;
use App\Http\Controllers\Api\VtuController;
use App\Http\Controllers\Api\WalletController;
use App\Http\Controllers\Api\WebhookController;
use Illuminate\Support\Facades\Route;

// Public
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);
Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/products', [ProductController::class, 'index']);
Route::get('/bank-details', [BankDetailController::class, 'index']);
Route::get('/site-settings', [SiteSettingController::class, 'index']);
Route::get('/orders/feed', [OrderController::class, 'feed']);
Route::post('/webhooks/sprintpay', [WebhookController::class, 'sprintpay'])
    ->middleware('throttle:60,1');

// Protected
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::match(['put', 'patch'], '/user/password', [AuthController::class, 'updatePassword']);

    Route::get('/profile', [ProfileController::class, 'show']);
    Route::put('/profile', [ProfileController::class, 'update']);
    Route::get('/wallet', [WalletController::class, 'show']);
    Route::get('/orders', [OrderController::class, 'index']);
    Route::get('/orders/{order}', [OrderController::class, 'show']);
    Route::get('/transactions', [TransactionController::class, 'myIndex']);
    Route::get('/orders/{order}/account-logs', [AccountLogController::class, 'byOrder']);
    Route::get('/messages', [MessageController::class, 'index']);
    Route::post('/messages', [MessageController::class, 'store']);
    Route::post('/messages/upload', [MessageController::class, 'upload']);
    Route::patch('/messages/{message}/read', [MessageController::class, 'markRead']);
    Route::get('/broadcast-messages', [BroadcastMessageController::class, 'index']);
    Route::get('/manual-payments', [ManualPaymentController::class, 'index']);
    Route::post('/manual-payments', [ManualPaymentController::class, 'store']);
    Route::post('/virtual-account', [VirtualAccountController::class, 'generate']);
    Route::post('/purchase', [PurchaseController::class, 'process']);

    // VTU / bills — wallet debited here; SprintPay fulfils via VTpass (see docs/VTU_SPRINTPAY.md)
    Route::post('/vtu/airtime', [VtuController::class, 'airtime']);
    Route::get('/vtu/catalog/data-networks', [VtuController::class, 'catalogDataNetworks']);
    Route::get('/vtu/catalog/data-variations', [VtuController::class, 'catalogDataVariations']);
    Route::get('/vtu/catalog/cable-plans', [VtuController::class, 'catalogCablePlans']);
    Route::get('/vtu/catalog/electricity-variations', [VtuController::class, 'catalogElectricityVariations']);
    Route::post('/vtu/data', [VtuController::class, 'data']);
    Route::get('/vtu/cable/validate', [VtuController::class, 'validateCable']);
    Route::post('/vtu/cable/buy', [VtuController::class, 'buyCable']);
    Route::get('/vtu/electricity/validate', [VtuController::class, 'validateElectricity']);
    Route::post('/vtu/electricity/buy', [VtuController::class, 'buyElectricity']);
});

// Admin only
Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {
    Route::patch('/orders/{order}/status', [OrderController::class, 'updateStatus']);
    Route::get('/profiles', [ProfileController::class, 'adminIndex']);
    Route::patch('/profiles/{profile}/block', [ProfileController::class, 'toggleBlock']);
    Route::post('/users', [AdminUserController::class, 'store']);
    Route::put('/users/{user}', [AdminUserController::class, 'update']);
    Route::delete('/users/{user}', [AdminUserController::class, 'destroy']);
    Route::post('/users/{user}/impersonate', [AdminUserController::class, 'impersonate']);
    Route::get('/wallets', [WalletController::class, 'adminIndex']);
    Route::post('/wallets/credit', [WalletController::class, 'credit']);
    Route::get('/orders', [OrderController::class, 'adminIndex']);
    Route::get('/products', [ProductController::class, 'adminIndex']);
    Route::post('/products', [ProductController::class, 'store']);
    Route::put('/products/{product}', [ProductController::class, 'update']);
    Route::delete('/products/{product}', [ProductController::class, 'destroy']);
    Route::post('/products/upload', [ProductController::class, 'upload']);
    Route::post('/products/bulk-upload', [ProductController::class, 'bulkUpload']);
    Route::get('/categories', [CategoryController::class, 'adminIndex']);
    Route::post('/categories', [CategoryController::class, 'store']);
    Route::put('/categories/{category}', [CategoryController::class, 'update']);
    Route::delete('/categories/{category}', [CategoryController::class, 'destroy']);
    Route::patch('/categories/{category}/toggle', [CategoryController::class, 'toggle']);
    Route::post('/categories/upload', [CategoryController::class, 'upload']);
    Route::get('/transactions', [TransactionController::class, 'index']);
    Route::get('/user-roles', [UserRoleController::class, 'index']);
    Route::post('/user-roles', [UserRoleController::class, 'store']);
    Route::delete('/user-roles/{userRole}', [UserRoleController::class, 'destroy']);
    Route::get('/messages', [MessageController::class, 'adminIndex']);
    Route::post('/messages', [MessageController::class, 'store']);
    Route::patch('/messages/{message}/read', [MessageController::class, 'adminMarkRead']);
    Route::get('/broadcast-messages', [BroadcastMessageController::class, 'adminIndex']);
    Route::post('/broadcast-messages', [BroadcastMessageController::class, 'store']);
    Route::put('/broadcast-messages/{broadcastMessage}', [BroadcastMessageController::class, 'update']);
    Route::delete('/broadcast-messages/{broadcastMessage}', [BroadcastMessageController::class, 'destroy']);
    Route::get('/account-logs', [AccountLogController::class, 'index']);
    Route::post('/account-logs', [AccountLogController::class, 'store']);
    Route::delete('/account-logs/{accountLog}', [AccountLogController::class, 'destroy']);
    Route::post('/account-logs/bulk-delete', [AccountLogController::class, 'bulkDestroy']);
    Route::post('/account-logs/bulk', [AccountLogController::class, 'bulkStore']);
    Route::get('/account-logs/limits', [AccountLogController::class, 'limits']);
    Route::get('/manual-payments', [ManualPaymentController::class, 'adminIndex']);
    Route::post('/manual-payments/{manualPayment}/approve', [ManualPaymentController::class, 'approve']);
    Route::patch('/manual-payments/{manualPayment}/reject', [ManualPaymentController::class, 'reject']);
    Route::put('/manual-payments/{manualPayment}', [ManualPaymentController::class, 'update']);
    Route::post('/manual-payments', [ManualPaymentController::class, 'adminStore']);
    Route::get('/bank-details', [BankDetailController::class, 'adminIndex']);
    Route::post('/bank-details', [BankDetailController::class, 'store']);
    Route::put('/bank-details/{bankDetail}', [BankDetailController::class, 'update']);
    Route::delete('/bank-details/{bankDetail}', [BankDetailController::class, 'destroy']);
    Route::get('/site-settings', [SiteSettingController::class, 'adminIndex']);
    Route::put('/site-settings', [SiteSettingController::class, 'update']);
    Route::post('/site-settings/upload-logo', [SiteSettingController::class, 'uploadLogo']);
});
