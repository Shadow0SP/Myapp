<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('verification_codes', function (Blueprint $table) {
            // Добавляем счётчик неверных попыток ввода кода.
            // after('used') — колонка встанет сразу после колонки used
            $table->tinyInteger('attempts')->default(0)->after('used');
        });
    }

    public function down(): void
    {
        Schema::table('verification_codes', function (Blueprint $table) {
            $table->dropColumn('attempts');
        });
    }
};