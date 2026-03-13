<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Создаём таблицу для хранения кодов подтверждения.
     * Один объект Migration = одно изменение БД.
     */
    public function up(): void
    {
        Schema::create('verification_codes', function (Blueprint $table) {
            $table->id();                                    // Первичный ключ
            $table->string('email');                         // Email для которого выдан код
            $table->string('code', 4);                       // 4-значный код
            $table->string('type');                          // Тип кода: 'email_verification' или 'password_reset'
            $table->timestamp('expires_at');                 // Когда истекает
            $table->boolean('used')->default(false);         // Использован ли код (чтобы нельзя было применить дважды)
            $table->timestamps();                            // created_at и updated_at
        });
    }

    /**
     * Откат миграции — удаляем таблицу.
     * Вызывается командой php artisan migrate:rollback
     */
    public function down(): void
    {
        Schema::dropIfExists('verification_codes');
    }
};