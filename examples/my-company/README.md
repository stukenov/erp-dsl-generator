# Пример проекта MyCompany

Этот пример демонстрирует как организовать ERP проект с несколькими модулями в отдельных файлах.

## Структура проекта

```
my-company/
├── domain.erp          # Основные сущности (User, Company)
├── sales.erp           # Модуль продаж (Customer, Product, Order)
├── inventory.erp       # Модуль склада (Warehouse, StockItem)
├── erp.yaml           # Конфигурация проекта
└── README.md          # Этот файл
```

## Как использовать

1. Перейдите в корневую папку erp-core:
```bash
cd /path/to/erp-core
```

2. Запустите генерацию из этой папки:
```bash
npm run demo:folder examples/my-company
```

3. Перейдите в сгенерированный проект:
```bash
cd output/mycompany-from-folder
```

4. Запустите проект:
```bash
./start.sh    # Linux/Mac
start.bat     # Windows
```

## Что будет сгенерировано

- **3 модуля**: Core, Sales, Inventory
- **8 сущностей**: User, Company, Customer, Product, Order, OrderLine, Warehouse, StockItem, StockMovement
- **4 действия**: ConfirmOrder, ShipOrder, ReceiveGoods, ShipGoods
- **3 формы**: CustomerForm, WarehouseForm, StockItemForm
- **6 ролей**: Admin, Manager, User, SalesManager, SalesAgent, Customer, WarehouseManager, WarehouseWorker, Viewer

## Особенности

- **Мульти-модульная архитектура** - каждый модуль в отдельном файле
- **Связи между модулями** - Customer связан с Company из другого модуля
- **Бизнес-логика** - действия с условиями и событиями
- **Контроль доступа** - роли с разными уровнями доступа
- **Кастомные формы** - настроенные UI формы для сущностей 