FROM php:8.4-fpm-alpine

RUN apk add --no-cache git unzip icu-dev libzip-dev postgresql-dev \
    && docker-php-ext-install pdo_pgsql intl zip opcache

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

CMD ["php-fpm", "-F"]
