# Простой пример SimpleCompany

Этот пример демонстрирует базовую функциональность ERP Core с простым парсером.

## Структура

```
simple-company/
├── domain.erp     # Все сущности в одном файле
├── erp.yaml       # Конфигурация
└── README.md      # Этот файл
```

## Использование

```bash
# Генерация из простого примера
npm run demo:folder examples/simple-company

# Перейти в сгенерированный проект
cd output/simplecompany-from-folder

# Запустить
./start.sh    # Linux/Mac
start.bat     # Windows
```

## Что включено

- **5 сущностей**: User, Company, Customer, Product, Order
- **3 роли**: Admin, Manager, User
- **Простые типы данных**: Text, Email, Phone, Money, Int, Bool
- **Связи между сущностями**: Order → Customer, Order → Product

## Особенности

- Совместимость с простым парсером
- Все определения в одном файле
- Базовые типы данных
- Простые связи 