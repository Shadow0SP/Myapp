<?php

namespace App\Services;

use App\Models\VerificationCode;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;

class CodeService
{
    /**
     * Генерирует и отправляет код на email.
     *
     * Защиты:
     * - Rate limiting: нельзя запросить новый код чаще раза в 60 секунд.
     *   Если попытка слишком ранняя — бросает исключение, контроллер вернёт 429.
     * - Старые коды для этого email+type удаляются перед созданием нового.
     */
    public function sendCode(string $email, string $type): void
    {
        // Проверяем: есть ли код созданный меньше 60 секунд назад?
        $recentCode = VerificationCode::where('email', $email)
            ->where('type', $type)
            ->where('created_at', '>=', Carbon::now()->subSeconds(VerificationCode::RESEND_COOLDOWN_SECONDS))
            ->first();

        if ($recentCode) {
            // Считаем сколько секунд ещё нужно подождать
            $secondsAgo = Carbon::now()->diffInSeconds($recentCode->created_at);
            $waitSeconds = VerificationCode::RESEND_COOLDOWN_SECONDS - $secondsAgo;
            throw new \Exception("Подождите {$waitSeconds} сек. перед повторной отправкой.");
        }

        // Удаляем все старые коды этого типа для данного email
        VerificationCode::where('email', $email)->where('type', $type)->delete();

        // Генерируем случайный 4-значный код с ведущими нулями (0000–9999)
        $code = str_pad(random_int(0, 9999), 4, '0', STR_PAD_LEFT);

        // Сохраняем в БД
        VerificationCode::create([
            'email'      => $email,
            'code'       => $code,
            'type'       => $type,
            'expires_at' => Carbon::now()->addMinutes(VerificationCode::TTL_MINUTES),
            'used'       => false,
            'attempts'   => 0,
        ]);

        // Отправляем письмо (при MAIL_MAILER=log — пишет в storage/logs/laravel.log)
        $subject = $type === 'email_verification'
            ? 'Подтверждение email — MyApp'
            : 'Сброс пароля — MyApp';

        $body = $type === 'email_verification'
            ? "Ваш код подтверждения: {$code}\n\nКод действителен 5 минут.\n\nЕсли вы не регистрировались — проигнорируйте письмо."
            : "Ваш код для сброса пароля: {$code}\n\nКод действителен 5 минут.\n\nЕсли вы не запрашивали сброс — проигнорируйте письмо.";

        Mail::raw($body, fn($m) => $m->to($email)->subject($subject));
    }

    /**
     * Проверяет код и при успехе помечает его использованным.
     * При неверном коде — увеличивает счётчик попыток.
     *
     * Возвращает массив:
     *   success   => bool        — верный код или нет
     *   message   => string      — текст ошибки для пользователя
     *   remaining => int|null    — сколько попыток осталось (null = не применимо)
     */
    public function verifyCode(string $email, string $code, string $type): array
    {
        $record = VerificationCode::where('email', $email)
            ->where('type', $type)
            ->where('used', false)
            ->latest()
            ->first();

        if (!$record) {
            return ['success' => false, 'message' => 'Код не найден. Запросите новый.', 'remaining' => null];
        }

        if ($record->isExhausted()) {
            return ['success' => false, 'message' => 'Код аннулирован. Запросите новый.', 'remaining' => 0];
        }

        if ($record->isExpired()) {
            return ['success' => false, 'message' => 'Код истёк. Запросите новый.', 'remaining' => null];
        }

        if ($record->code !== $code) {
            // Неверный код — увеличиваем счётчик попыток
            $remaining = $record->incrementAttempts();

            if ($remaining === 0) {
                return ['success' => false, 'message' => 'Код аннулирован после 3 неверных попыток. Запросите новый.', 'remaining' => 0];
            }

            return ['success' => false, 'message' => "Неверный код. Осталось попыток: {$remaining}.", 'remaining' => $remaining];
        }

        // Код верный — помечаем использованным
        $record->update(['used' => true]);

        return ['success' => true, 'message' => 'Код подтверждён.', 'remaining' => null];
    }

    /**
     * Проверяет код БЕЗ пометки как использованный.
     *
     * Зачем: при сбросе пароля шаг 2 проверяет код, но не тратит его —
     * тот же код нужен на шаге 3 для финальной смены пароля.
     * Попытки при неверном коде всё равно считаются.
     */
    public function checkCode(string $email, string $code, string $type): array
    {
        $record = VerificationCode::where('email', $email)
            ->where('type', $type)
            ->where('used', false)
            ->latest()
            ->first();

        if (!$record) {
            return ['success' => false, 'message' => 'Код не найден. Запросите новый.', 'remaining' => null];
        }

        if ($record->isExhausted()) {
            return ['success' => false, 'message' => 'Код аннулирован. Запросите новый.', 'remaining' => 0];
        }

        if ($record->isExpired()) {
            return ['success' => false, 'message' => 'Код истёк. Запросите новый.', 'remaining' => null];
        }

        if ($record->code !== $code) {
            $remaining = $record->incrementAttempts();

            if ($remaining === 0) {
                return ['success' => false, 'message' => 'Код аннулирован после 3 неверных попыток. Запросите новый.', 'remaining' => 0];
            }

            return ['success' => false, 'message' => "Неверный код. Осталось попыток: {$remaining}.", 'remaining' => $remaining];
        }

        // Код верный — НЕ помечаем использованным, он нужен на следующем шаге
        return ['success' => true, 'message' => 'Код подтверждён.', 'remaining' => null];
    }
}