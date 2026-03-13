<?php

return [
    'required'  => 'Поле «:attribute» обязательно для заполнения.',
    'string'    => 'Поле «:attribute» должно быть строкой.',
    'email'     => 'Введите корректный email адрес.',
    'unique'    => 'Такой :attribute уже зарегистрирован.',
    'min'       => ['string' => 'Поле «:attribute» должно содержать не менее :min символов.'],
    'max'       => ['string' => 'Поле «:attribute» не должно превышать :max символов.'],
    'confirmed' => 'Пароли не совпадают.',
    'exists'    => 'Пользователь с таким email не найден.',
    'size'      => ['string' => 'Поле «:attribute» должно содержать ровно :size символов.'],

    'attributes' => [
        'name'                  => 'имя',
        'email'                 => 'email',
        'password'              => 'пароль',
        'password_confirmation' => 'подтверждение пароля',
        'code'                  => 'код',
    ],
];