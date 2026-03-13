<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\CodeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use OpenApi\Attributes as OA;

#[OA\Info(
    title: 'MyApp API',
    version: '1.0.0',
    description: 'API для аутентификации, email-верификации и сброса пароля'
)]
#[OA\Server(
    url: '/api',
    description: 'Основной сервер'
)]
#[OA\SecurityScheme(
    securityScheme: 'bearerAuth',
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT'
)]
class AuthController extends Controller
{
    public function __construct(private CodeService $codeService) {}

    // =========================================================================
    // РЕГИСТРАЦИЯ
    // =========================================================================

    #[OA\Post(
        path: '/register',
        summary: 'Регистрация нового пользователя',
        tags: ['Регистрация и верификация'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['name', 'email', 'password', 'password_confirmation'],
                properties: [
                    new OA\Property(property: 'name',                  type: 'string',  example: 'Иван Иванов'),
                    new OA\Property(property: 'email',                 type: 'string',  format: 'email', example: 'user@example.com'),
                    new OA\Property(property: 'password',              type: 'string',  minLength: 8, example: 'password123'),
                    new OA\Property(property: 'password_confirmation', type: 'string',  example: 'password123'),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Аккаунт создан, код отправлен на email',
                content: new OA\JsonContent(properties: [
                    new OA\Property(property: 'message', type: 'string', example: 'Аккаунт создан. Проверьте почту и введите код.'),
                    new OA\Property(property: 'email',   type: 'string', example: 'user@example.com'),
                ])
            ),
            new OA\Response(response: 422, description: 'Ошибка валидации'),
            new OA\Response(response: 429, description: 'Слишком много запросов'),
        ]
    )]
    public function register(Request $request)
    {
        $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|string|email|unique:users',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = User::create([
            'name'     => $request->name,
            'email'    => $request->email,
            'password' => Hash::make($request->password),
        ]);

        try {
            $this->codeService->sendCode($user->email, 'email_verification');
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 429);
        }

        return response()->json([
            'message' => 'Аккаунт создан. Проверьте почту и введите код.',
            'email'   => $user->email,
        ], 201);
    }

    #[OA\Post(
        path: '/verify-email',
        summary: 'Подтверждение email по коду',
        tags: ['Регистрация и верификация'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['email', 'code'],
                properties: [
                    new OA\Property(property: 'email', type: 'string', format: 'email', example: 'user@example.com'),
                    new OA\Property(property: 'code',  type: 'string', minLength: 4, maxLength: 4, example: '4827'),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Email подтверждён, токен выдан',
                content: new OA\JsonContent(properties: [
                    new OA\Property(property: 'message', type: 'string', example: 'Email подтверждён.'),
                    new OA\Property(property: 'token',   type: 'string', example: '1|abc123...'),
                    new OA\Property(property: 'user',    type: 'object'),
                ])
            ),
            new OA\Response(
                response: 422,
                description: 'Неверный или устаревший код',
                content: new OA\JsonContent(properties: [
                    new OA\Property(property: 'message',   type: 'string',  example: 'Неверный код. Осталось попыток: 2.'),
                    new OA\Property(property: 'remaining', type: 'integer', example: 2),
                ])
            ),
        ]
    )]
    public function verifyEmail(Request $request)
    {
        $request->validate([
            'email' => 'required|string|email|exists:users',
            'code'  => 'required|string|size:4',
        ]);

        $result = $this->codeService->verifyCode($request->email, $request->code, 'email_verification');

        if (!$result['success']) {
            return response()->json([
                'message'   => $result['message'],
                'remaining' => $result['remaining'],
            ], 422);
        }

        $user = User::where('email', $request->email)->first();
        $user->email_verified_at = now();
        $user->save();

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'message' => 'Email подтверждён.',
            'token'   => $token,
            'user'    => $user,
        ]);
    }

    #[OA\Post(
        path: '/resend-verification',
        summary: 'Повторная отправка кода подтверждения email',
        tags: ['Регистрация и верификация'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['email'],
                properties: [
                    new OA\Property(property: 'email', type: 'string', format: 'email', example: 'user@example.com'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Новый код отправлен'),
            new OA\Response(response: 400, description: 'Email уже подтверждён'),
            new OA\Response(response: 429, description: 'Подождите перед повторной отправкой'),
        ]
    )]
    public function resendVerificationCode(Request $request)
    {
        $request->validate(['email' => 'required|string|email|exists:users']);

        $user = User::where('email', $request->email)->first();

        if ($user->email_verified_at) {
            return response()->json(['message' => 'Email уже подтверждён.'], 400);
        }

        try {
            $this->codeService->sendCode($request->email, 'email_verification');
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 429);
        }

        return response()->json(['message' => 'Новый код отправлен на почту.']);
    }

    // =========================================================================
    // ВХОД
    // =========================================================================

    #[OA\Post(
        path: '/login',
        summary: 'Вход в систему',
        tags: ['Вход и выход'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['email', 'password'],
                properties: [
                    new OA\Property(property: 'email',    type: 'string', format: 'email', example: 'user@example.com'),
                    new OA\Property(property: 'password', type: 'string', example: 'password123'),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Вход выполнен успешно',
                content: new OA\JsonContent(properties: [
                    new OA\Property(property: 'message', type: 'string', example: 'Вход выполнен.'),
                    new OA\Property(property: 'token',   type: 'string', example: '1|abc123...'),
                    new OA\Property(property: 'user',    type: 'object'),
                ])
            ),
            new OA\Response(
                response: 403,
                description: 'Email не подтверждён',
                content: new OA\JsonContent(properties: [
                    new OA\Property(property: 'message',               type: 'string',  example: 'Email не подтверждён. Код отправлен на почту.'),
                    new OA\Property(property: 'email',                 type: 'string',  example: 'user@example.com'),
                    new OA\Property(property: 'requires_verification', type: 'boolean', example: true),
                ])
            ),
            new OA\Response(response: 422, description: 'Неверный email или пароль'),
        ]
    )]
    public function login(Request $request)
    {
        $request->validate([
            'email'    => 'required|string|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Неверный email или пароль.'],
            ]);
        }

        if (!$user->email_verified_at) {
            try {
                $this->codeService->sendCode($user->email, 'email_verification');
            } catch (\Exception $e) {
                // cooldown — код уже был отправлен недавно, просто показываем форму
            }

            return response()->json([
                'message'               => 'Email не подтверждён. Код отправлен на почту.',
                'email'                 => $user->email,
                'requires_verification' => true,
            ], 403);
        }

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'message' => 'Вход выполнен.',
            'token'   => $token,
            'user'    => $user,
        ]);
    }

    // =========================================================================
    // ВЫХОД
    // =========================================================================

    #[OA\Post(
        path: '/logout',
        summary: 'Выход из системы',
        tags: ['Вход и выход'],
        security: [['bearerAuth' => []]],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Выход выполнен',
                content: new OA\JsonContent(properties: [
                    new OA\Property(property: 'message', type: 'string', example: 'Выход выполнен.'),
                ])
            ),
            new OA\Response(response: 401, description: 'Не авторизован'),
        ]
    )]
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Выход выполнен.']);
    }

    // =========================================================================
    // СБРОС ПАРОЛЯ
    // =========================================================================

    #[OA\Post(
        path: '/forgot-password',
        summary: 'Запрос кода для сброса пароля',
        tags: ['Сброс пароля'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['email'],
                properties: [
                    new OA\Property(property: 'email', type: 'string', format: 'email', example: 'user@example.com'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Код отправлен на почту'),
            new OA\Response(response: 422, description: 'Пользователь не найден'),
            new OA\Response(response: 429, description: 'Подождите перед повторной отправкой'),
        ]
    )]
    public function forgotPassword(Request $request)
    {
        $request->validate(['email' => 'required|string|email|exists:users']);

        try {
            $this->codeService->sendCode($request->email, 'password_reset');
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 429);
        }

        return response()->json([
            'message' => 'Код отправлен на почту.',
            'email'   => $request->email,
        ]);
    }

    #[OA\Post(
        path: '/verify-reset-code',
        summary: 'Проверка кода сброса пароля',
        tags: ['Сброс пароля'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['email', 'code'],
                properties: [
                    new OA\Property(property: 'email', type: 'string', format: 'email', example: 'user@example.com'),
                    new OA\Property(property: 'code',  type: 'string', minLength: 4, maxLength: 4, example: '3951'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Код верный'),
            new OA\Response(
                response: 422,
                description: 'Неверный код',
                content: new OA\JsonContent(properties: [
                    new OA\Property(property: 'message',   type: 'string',  example: 'Неверный код. Осталось попыток: 1.'),
                    new OA\Property(property: 'remaining', type: 'integer', example: 1),
                ])
            ),
        ]
    )]
    public function verifyResetCode(Request $request)
    {
        $request->validate([
            'email' => 'required|string|email|exists:users',
            'code'  => 'required|string|size:4',
        ]);

        $result = $this->codeService->checkCode($request->email, $request->code, 'password_reset');

        if (!$result['success']) {
            return response()->json([
                'message'   => $result['message'],
                'remaining' => $result['remaining'],
            ], 422);
        }

        return response()->json(['message' => 'Код верный.']);
    }

    #[OA\Post(
        path: '/reset-password',
        summary: 'Установка нового пароля',
        tags: ['Сброс пароля'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['email', 'code', 'password', 'password_confirmation'],
                properties: [
                    new OA\Property(property: 'email',                 type: 'string', format: 'email', example: 'user@example.com'),
                    new OA\Property(property: 'code',                  type: 'string', minLength: 4, maxLength: 4, example: '3951'),
                    new OA\Property(property: 'password',              type: 'string', minLength: 8, example: 'newpassword123'),
                    new OA\Property(property: 'password_confirmation', type: 'string', example: 'newpassword123'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Пароль успешно изменён'),
            new OA\Response(response: 422, description: 'Неверный или устаревший код'),
        ]
    )]
    public function resetPassword(Request $request)
    {
        $request->validate([
            'email'                 => 'required|string|email|exists:users',
            'code'                  => 'required|string|size:4',
            'password'              => 'required|string|min:8|confirmed',
            'password_confirmation' => 'required|string',
        ]);

        $result = $this->codeService->verifyCode($request->email, $request->code, 'password_reset');

        if (!$result['success']) {
            return response()->json([
                'message'   => $result['message'],
                'remaining' => $result['remaining'],
            ], 422);
        }

        $user = User::where('email', $request->email)->first();
        $user->password = Hash::make($request->password);
        $user->save();

        return response()->json(['message' => 'Пароль успешно изменён.']);
    }
}