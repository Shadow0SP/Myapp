<?php

use App\Http\Controllers\Api\AuthController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Проверочный маршрут
Route::get('/', function () {
    return response()->json([
        'message'   => 'API is running!',
        'timestamp' => now(),
    ]);
});

// === ПУБЛИЧНЫЕ МАРШРУТЫ (без токена) ===

// --- Регистрация ---
Route::post('/register', [AuthController::class, 'register']);
// Шаг 2: подтверждение кода из письма
Route::post('/verify-email', [AuthController::class, 'verifyEmail']);
// Повторная отправка кода (если не пришёл)
Route::post('/resend-verification', [AuthController::class, 'resendVerificationCode']);

// --- Вход ---
Route::post('/login', [AuthController::class, 'login']);

// --- Сброс пароля ---
// Шаг 1: запрос кода
Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
// Шаг 2: проверка кода (без смены пароля)
Route::post('/verify-reset-code', [AuthController::class, 'verifyResetCode']);
// Шаг 3: смена пароля
Route::post('/reset-password', [AuthController::class, 'resetPassword']);

// === ЗАЩИЩЁННЫЕ МАРШРУТЫ (требуют Bearer токен) ===
Route::middleware('auth:sanctum')->group(function () {

    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    Route::post('/logout', [AuthController::class, 'logout']);
});