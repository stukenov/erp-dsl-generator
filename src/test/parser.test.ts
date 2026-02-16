import { describe, it, expect } from 'vitest';
import { parser } from '../parser/index.js';

describe('ERP DSL Parser', () => {
  it('should parse simple entity declaration', () => {
    const dsl = `
erp TestERP 0.1

entity User {
  name: Text(required)
  email: Email(unique)
}
`;

    const result = parser.parse(dsl);
    
    expect(result.success).toBe(true);
    expect(result.ast).toBeDefined();
    expect(result.ast!.name).toBe('TestERP');
    expect(result.ast!.version).toBe('0.1');
    expect(result.ast!.entities).toHaveLength(1);
    
    const entity = result.ast!.entities[0];
    expect(entity.name).toBe('User');
    expect(entity.fields).toHaveLength(2);
    expect(entity.fields[0].name).toBe('name');
    expect(entity.fields[0].fieldType.name).toBe('Text');
    expect(entity.fields[1].name).toBe('email');
    expect(entity.fields[1].fieldType.name).toBe('Email');
  });

  it('should parse entity with relations', () => {
    const dsl = `
erp TestERP 0.1

entity Order {
  customer: Customer(1)
  lines: OrderLine*
}
`;

    const result = parser.parse(dsl);
    
    expect(result.success).toBe(true);
    expect(result.ast!.entities[0].relations).toHaveLength(2);
    
    const customerRel = result.ast!.entities[0].relations[0];
    expect(customerRel.name).toBe('customer');
    expect(customerRel.targetEntity).toBe('Customer');
    expect(customerRel.cardinality).toBe('one');
    
    const linesRel = result.ast!.entities[0].relations[1];
    expect(linesRel.name).toBe('lines');
    expect(linesRel.targetEntity).toBe('OrderLine');
    expect(linesRel.cardinality).toBe('many');
  });

  it('should parse enum field types', () => {
    const dsl = `
erp TestERP 0.1

entity Order {
  status: Enum[Draft,Confirmed,Shipped]=Draft
}
`;

    const result = parser.parse(dsl);
    
    expect(result.success).toBe(true);
    
    const field = result.ast!.entities[0].fields[0];
    expect(field.fieldType.name).toBe('Enum');
    expect(field.fieldType.parameters).toHaveLength(2);
    
    const valuesParam = field.fieldType.parameters.find(p => p.name === 'values');
    expect(valuesParam).toBeDefined();
    expect(valuesParam!.value).toBe('Draft,Confirmed,Shipped');
    
    const defaultParam = field.fieldType.parameters.find(p => p.name === 'default');
    expect(defaultParam).toBeDefined();
    expect(defaultParam!.value).toBe('Draft');
  });

  it('should parse action declarations', () => {
    const dsl = `
erp TestERP 0.1

action ConfirmOrder(order: Order) when order.status==Draft {
  order.status = Confirmed
  emit OrderConfirmed(order.id)
}
`;

    const result = parser.parse(dsl);
    
    expect(result.success).toBe(true);
    expect(result.ast!.actions).toHaveLength(1);
    
    const action = result.ast!.actions[0];
    expect(action.name).toBe('ConfirmOrder');
    expect(action.parameters).toHaveLength(1);
    expect(action.parameters[0].name).toBe('order');
    expect(action.parameters[0].paramType).toBe('Order');
    expect(action.condition).toBeDefined();
    expect(action.body).toHaveLength(2);
  });

  it('should parse form declarations', () => {
    const dsl = `
erp TestERP 0.1

form CustomerEdit for Customer layout=2col {
  group "Basic Info" {
    name, email, phone
  }
}
`;

    const result = parser.parse(dsl);
    
    expect(result.success).toBe(true);
    expect(result.ast!.forms).toHaveLength(1);
    
    const form = result.ast!.forms[0];
    expect(form.name).toBe('CustomerEdit');
    expect(form.entityName).toBe('Customer');
    expect(form.layout).toBe('2col');
    expect(form.groups).toHaveLength(1);
    expect(form.groups[0].name).toBe('Basic Info');
    expect(form.groups[0].fields).toEqual(['name', 'email', 'phone']);
  });

  it('should parse role declarations', () => {
    const dsl = `
erp TestERP 0.1

role Admin grants * on *
role Sales grants rcu on Customer,Order except fields tier
`;

    const result = parser.parse(dsl);
    
    expect(result.success).toBe(true);
    expect(result.ast!.roles).toHaveLength(2);
    
    const adminRole = result.ast!.roles[0];
    expect(adminRole.name).toBe('Admin');
    expect(adminRole.grants[0].permissions).toEqual(['*']);
    expect(adminRole.grants[0].target).toBe('*');
    
    const salesRole = result.ast!.roles[1];
    expect(salesRole.name).toBe('Sales');
    expect(salesRole.grants[0].permissions).toEqual(['rcu']);
    expect(salesRole.grants[0].target).toBe('Customer,Order');
    expect(salesRole.grants[0].exceptions).toEqual(['tier']);
  });

  it('should parse use pack declarations', () => {
    const dsl = `
erp TestERP 0.1

use pack Base.v0
use pack Accounting.v2025
`;

    const result = parser.parse(dsl);
    
    expect(result.success).toBe(true);
    expect(result.ast!.packs).toHaveLength(2);
    expect(result.ast!.packs[0].packName).toBe('Base.v0');
    expect(result.ast!.packs[1].packName).toBe('Accounting.v2025');
  });

  it('should parse module declarations', () => {
    const dsl = `
erp TestERP 0.1

module Sales {
  entity Customer {
    name: Text
  }
  
  action CreateCustomer(name: Text) {
    call CustomerService.create(name=name)
  }
}
`;

    const result = parser.parse(dsl);
    
    expect(result.success).toBe(true);
    expect(result.ast!.modules).toHaveLength(1);
    
    const module = result.ast!.modules[0];
    expect(module.name).toBe('Sales');
    expect(module.entities).toHaveLength(1);
    expect(module.actions).toHaveLength(1);
    expect(module.entities[0].name).toBe('Customer');
    expect(module.actions[0].name).toBe('CreateCustomer');
  });

  it('should validate entity references', () => {
    const dsl = `
erp TestERP 0.1

entity Order {
  customer: NonExistentEntity(1)
}
`;

    const result = parser.parse(dsl);
    
    expect(result.success).toBe(true);
    
    const validationErrors = parser.validate(result.ast!);
    expect(validationErrors).toHaveLength(1);
    expect(validationErrors[0].type).toBe('semantic');
    expect(validationErrors[0].message).toContain('NonExistentEntity');
  });

  it('should detect duplicate entity names', () => {
    const dsl = `
erp TestERP 0.1

entity User {
  name: Text
}

entity User {
  email: Email
}
`;

    const result = parser.parse(dsl);
    
    expect(result.success).toBe(true);
    
    const validationErrors = parser.validate(result.ast!);
    expect(validationErrors.length).toBeGreaterThan(0);
    expect(validationErrors.some(e => e.message.includes('Duplicate entity name'))).toBe(true);
  });

  it('should handle field type parameters', () => {
    const dsl = `
erp TestERP 0.1

entity Product {
  name: Text(1..200, required, i18n)
  price: Decimal(12,3, min=0)
  description: Text(max=1000)
}
`;

    const result = parser.parse(dsl);
    
    expect(result.success).toBe(true);
    
    const entity = result.ast!.entities[0];
    const nameField = entity.fields[0];
    expect(nameField.fieldType.parameters).toHaveLength(1);
    
    const priceField = entity.fields[1];
    expect(priceField.fieldType.parameters).toHaveLength(2);
    
    const descField = entity.fields[2];
    expect(descField.fieldType.parameters).toHaveLength(1);
  });

  it('should handle parsing errors gracefully', () => {
    const invalidDsl = `
erp TestERP 0.1

entity {
  name Text
}
`;

    const result = parser.parse(invalidDsl);
    
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].type).toBe('syntactic');
  });
}); 