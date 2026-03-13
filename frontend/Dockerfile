FROM node:22-alpine

WORKDIR /app

# Копируем package файлы
COPY package*.json ./

# Установка зависимостей
RUN npm install

# Копируем исходный код
COPY . .

# Открываем порт Vite
EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]