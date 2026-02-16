# ERP Core — Генератор кода на основе DSL

![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)

**ERP Core** — минимальное, расширяемое ядро для создания ERP систем, где **один исходный DSL** описывает данные, интерфейс, бизнес-логику, интеграции и соглашения, а из него автоматически генерируются: миграции БД, backend API, UI компоненты, события, права доступа и документация.

## 🎯 Философия

- **Конвенция важнее конфигурации** — чем меньше опций, тем быстрее MVP
- **DSL как живая спецификация** — исходный код домена всегда первичен
- **Слои генерации** — от DSL к IR, от IR к артефактам
- **Обратимость** — генерируемый код помечается тегами, ручные доработки сохраняются

## 🏗️ Архитектура

```
DSL → AST → CIR (Canonical IR) → Генераторы → Артефакты
                                      ↓
                              SQL, TypeScript, React, 
                              Документация, Тесты
```

### Основные компоненты

- **Parser** — парсинг DSL в AST
- **CIR Converter** — нормализация AST в каноническое IR
- **Генераторы** — создание кода из CIR
- **Runtime** — исполнение сгенерированного кода

## 📦 Установка

```bash
# Клонирование репозитория
git clone https://github.com/stukenov/erp-core.git
cd erp-core

# Установка зависимостей
npm install
# или
yarn install

# Сборка проекта
npm run build

# Глобальная установка CLI
npm install -g .
```

## 🚀 Быстрый старт

### 1. Создание проекта

```bash
mkdir my-erp
cd my-erp
erp init
```

### 2. Определение домена

Создайте файл `domain.erp`:

```erpl
erp MyCompany 1.0.0

use pack Base.v1

module Sales {
  doc = "Модуль продаж"

  entity Customer {
    doc = "Клиент компании"
    pk = id
    name: Text(required, max=200)
    email: Email(unique)
    phone: Phone?
    tier: Enum[Regular,VIP,Blocked]=Regular
    
    created_at: DateTime(auto_create)
    updated_at: DateTime(auto_update)
  }

  entity Order {
    doc = "Заказ клиента"
    number: Code(auto_seq="ORD-{YYYY}-{####}")
    customer: Customer(1)
    status: Enum[Draft,Confirmed,Shipped]=Draft
    total: Money(calc=sum(lines.amount))
    
    lines: OrderLine*
  }

  entity OrderLine {
    order: Order(1, backref=lines)
    product_name: Text(required, max=200)
    qty: Decimal(12,3)
    price: Money
    amount: Money(calc=qty*price)
  }
}

role Admin grants * on *
role Sales grants crud on Customer,Order,OrderLine
role Viewer grants read on *
```

### 3. Конфигурация проекта

Создайте `erp.yaml`:

```yaml
name: MyCompany
version: 1.0.0
description: "Корпоративная ERP система"

database:
  type: sqlite
  file: database.sqlite

conventions:
  - Base.v1
  - Business.v1

features:
  - audit_trails: true
  - event_system: true
  - role_based_access: true

ui:
  theme: default
  language: ru
  currency: RUB
```

### 4. Генерация кода

```bash
# Парсинг и генерация всех артефактов
erp build

# Создание миграций БД
erp migrate

# Запуск сервера разработки
erp serve --dev
```

## 📚 DSL Синтаксис

### Основные конструкции

#### Сущности (Entities)

```erpl
entity Customer {
  doc = "Описание сущности"
  pk = id                              # первичный ключ
  
  # Поля с типами
  name: Text(required, max=200)        # обязательный текст
  email: Email(unique)                 # email с уникальностью
  phone: Phone?                        # опциональный телефон
  age: Int(min=0, max=120)            # целое число с ограничениями
  balance: Money(currency=RUB)         # денежный тип
  status: Enum[Active,Inactive]=Active # перечисление с дефолтом
  
  # Системные поля
  created_at: DateTime(auto_create)
  updated_at: DateTime(auto_update)
}
```

#### Связи (Relations)

```erpl
entity Order {
  customer: Customer(1)        # многие к одному (FK)
  lines: OrderLine*           # один ко многим
}

entity OrderLine {
  order: Order(1, backref=lines, cascade)  # обратная связь с каскадом
}
```

#### Действия (Actions)

```erpl
action ConfirmOrder(order: Order) when order.status==Draft {
  order.status = Confirmed
  emit Event.OrderConfirmed(order.id)
}
```

#### Роли и права доступа

```erpl
role Admin grants * on *
role Sales grants crud on Customer,Order except fields balance
role Viewer grants read on * 

policy Customer.email mask='***@***' for role Viewer
```

## 🛠️ Генераторы

### SQL Generator
Создает миграции для PostgreSQL/SQLite:
```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  email VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### TypeScript Backend Generator
Генерирует типы, схемы валидации и API:
```typescript
export const CustomerSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  email: z.string().email().optional(),
});

export type Customer = z.infer<typeof CustomerSchema>;
```

### React UI Generator
Создает формы и списки:
```tsx
export function CustomerForm(props: {id?: string}) {
  const schema = useSchema('Sales', 'Customer');
  return <AutoForm schema={schema} {...props} />;
}
```

## 🧪 Тестирование

```bash
# Запуск всех тестов
npm test

# Тесты в режиме watch
npm run test:watch

# Демо примеры
npm run demo:full
npm run demo:backend
npm run demo:fullstack
```

## 📁 Структура проекта

```
erp-core/
├── src/
│   ├── parser/           # Парсеры DSL
│   ├── cir/             # CIR конверторы
│   ├── generators/      # Генераторы кода
│   └── types/           # TypeScript типы
├── examples/            # Примеры проектов
└── docs/               # Документация
```

## 🔧 CLI Команды

```bash
erp init [name]          # Создание нового проекта
erp build               # Парсинг и генерация кода
erp migrate             # Создание/применение миграций
erp serve [--dev]       # Запуск сервера
erp validate            # Валидация DSL
erp scaffold <entity>   # Создание заготовки сущности
```

## 📖 Примеры

В папке `examples/` находятся готовые примеры:

- **my-company** — полный пример с продажами и складом
- **simple-company** — минимальный пример
- **FinanceAccountingHub-Extra** — расширенный финансовый модуль

## 🎯 Roadmap

### v0.1 (текущая версия)
- ✅ DSL парсер и AST
- ✅ CIR генерация
- ✅ SQL генератор (SQLite/PostgreSQL)
- ✅ TypeScript backend генератор
- ✅ React UI генератор
- ✅ Базовые роли и ACL

### v0.2 (планируется)
- 🔄 Workflow engine
- 🔄 Event system
- 🔄 Action handlers
- 🔄 Convention packs система

### v0.3 (будущее)
- 📋 Отчеты и dashboards
- 📋 Mobile React Native
- 📋 Import/Export Excel
- 📋 i18n поддержка

## 🤝 Участие в разработке

1. Fork проекта
2. Создайте feature branch (`git checkout -b feature/amazing-feature`)
3. Commit изменения (`git commit -m 'Add amazing feature'`)
4. Push в branch (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## 📄 Лицензия

Проект распространяется под лицензией MIT. Подробности в файле [LICENSE](LICENSE).

## 👨‍💻 Автор

Copyright (c) 2025 Saken Tukenov

## 🆘 Поддержка

- 💬 Discussions: [GitHub Discussions](https://github.com/stukenov/erp-core/discussions)
- 🐛 Issues: [GitHub Issues](https://github.com/stukenov/erp-core/issues)

---

**ERP Core** — делаем создание ERP систем простым и быстрым! 🚀