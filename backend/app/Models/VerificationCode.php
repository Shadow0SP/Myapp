<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

class VerificationCode extends Model
{
    protected $fillable = [
        'email',
        'code',
        'type',
        'expires_at',
        'used',
        'attempts',  // счётчик неверных попыток
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'used'       => 'boolean',
        'attempts'   => 'integer',
    ];

    const MAX_ATTEMPTS        = 3;  // после 3 неверных попыток код аннулируется
    const TTL_MINUTES         = 5;  // код живёт 5 минут
    const RESEND_COOLDOWN_SECONDS = 60; // новый код можно запросить не раньше чем через 60 сек

    // Код истёк по времени?
    public function isExpired(): bool
    {
        return Carbon::now()->gte($this->expires_at);
    }

    // Попытки исчерпаны (3 раза ввели неверный код)?
    public function isExhausted(): bool
    {
        return $this->attempts >= self::MAX_ATTEMPTS;
    }

    // Код полностью действителен: не использован + не истёк + попытки не исчерпаны
    public function isValid(): bool
    {
        return !$this->used && !$this->isExpired() && !$this->isExhausted();
    }

    /**
     * Увеличивает счётчик неверных попыток на 1.
     * Если попыток больше не осталось — помечает код как использованный (аннулирует).
     * Возвращает количество оставшихся попыток.
     */
    public function incrementAttempts(): int
    {
        $this->increment('attempts');
        $this->refresh(); // перечитываем из БД чтобы получить актуальное значение

        $remaining = self::MAX_ATTEMPTS - $this->attempts;

        if ($remaining <= 0) {
            $this->update(['used' => true]); // аннулируем — больше нельзя использовать
            return 0;
        }

        return $remaining;
    }
}