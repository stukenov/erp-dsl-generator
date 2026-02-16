import { createToken, Lexer, TokenType } from 'chevrotain';

// Keywords
export const Erp = createToken({ name: 'Erp', pattern: /erp/ });
export const Use = createToken({ name: 'Use', pattern: /use/ });
export const Pack = createToken({ name: 'Pack', pattern: /pack/ });
export const Module = createToken({ name: 'Module', pattern: /module/ });
export const Entity = createToken({ name: 'Entity', pattern: /entity/ });
export const Action = createToken({ name: 'Action', pattern: /action/ });
export const Form = createToken({ name: 'Form', pattern: /form/ });
export const Role = createToken({ name: 'Role', pattern: /role/ });
export const View = createToken({ name: 'View', pattern: /view/ });
export const Workflow = createToken({ name: 'Workflow', pattern: /workflow/ });
export const Include = createToken({ name: 'Include', pattern: /include/ });
export const For = createToken({ name: 'For', pattern: /for/ });
export const When = createToken({ name: 'When', pattern: /when/ });
export const Do = createToken({ name: 'Do', pattern: /do/ });
export const On = createToken({ name: 'On', pattern: /on/ });
export const Emit = createToken({ name: 'Emit', pattern: /emit/ });
export const Call = createToken({ name: 'Call', pattern: /call/ });
export const Grants = createToken({ name: 'Grants', pattern: /grants/ });
export const Except = createToken({ name: 'Except', pattern: /except/ });
export const Fields = createToken({ name: 'Fields', pattern: /fields/ });
export const Layout = createToken({ name: 'Layout', pattern: /layout/ });
export const Group = createToken({ name: 'Group', pattern: /group/ });
export const Collapsible = createToken({ name: 'Collapsible', pattern: /collapsible/ });
export const Doc = createToken({ name: 'Doc', pattern: /doc/ });
export const Pk = createToken({ name: 'Pk', pattern: /pk/ });
export const List = createToken({ name: 'List', pattern: /list/ });
export const Policy = createToken({ name: 'Policy', pattern: /policy/ });
export const Initial = createToken({ name: 'Initial', pattern: /initial/ });
export const Conflicts = createToken({ name: 'Conflicts', pattern: /conflicts/ });
export const After = createToken({ name: 'After', pattern: /after/ });
export const Mask = createToken({ name: 'Mask', pattern: /mask/ });
export const Columns = createToken({ name: 'Columns', pattern: /columns/ });
export const Filters = createToken({ name: 'Filters', pattern: /filters/ });
export const Sort = createToken({ name: 'Sort', pattern: /sort/ });
export const Page = createToken({ name: 'Page', pattern: /page/ });
export const Asc = createToken({ name: 'Asc', pattern: /asc/ });
export const Desc = createToken({ name: 'Desc', pattern: /desc/ });
// Data types
export const Text = createToken({ name: 'Text', pattern: /Text/ });
export const Int = createToken({ name: 'Int', pattern: /Int/ });
export const Decimal = createToken({ name: 'Decimal', pattern: /Decimal/ });
export const Bool = createToken({ name: 'Bool', pattern: /Bool/ });
export const Date = createToken({ name: 'Date', pattern: /Date/ });
export const DateTime = createToken({ name: 'DateTime', pattern: /DateTime/ });
export const Money = createToken({ name: 'Money', pattern: /Money/ });
export const Email = createToken({ name: 'Email', pattern: /Email/ });
export const Phone = createToken({ name: 'Phone', pattern: /Phone/ });
export const Code = createToken({ name: 'Code', pattern: /Code/ });
export const Json = createToken({ name: 'Json', pattern: /Json/ });
export const Enum = createToken({ name: 'Enum', pattern: /Enum/ });
export const Tag = createToken({ name: 'Tag', pattern: /Tag/ });
export const Address = createToken({ name: 'Address', pattern: /Address/ });

// Operators and symbols
export const LCurly = createToken({ name: 'LCurly', pattern: /{/ });
export const RCurly = createToken({ name: 'RCurly', pattern: /}/ });
export const LParen = createToken({ name: 'LParen', pattern: /\(/ });
export const RParen = createToken({ name: 'RParen', pattern: /\)/ });
export const LBracket = createToken({ name: 'LBracket', pattern: /\[/ });
export const RBracket = createToken({ name: 'RBracket', pattern: /\]/ });
export const Comma = createToken({ name: 'Comma', pattern: /,/ });
export const Colon = createToken({ name: 'Colon', pattern: /:/ });
export const Semicolon = createToken({ name: 'Semicolon', pattern: /;/ });
export const Equals = createToken({ name: 'Equals', pattern: /=/ });
export const Dot = createToken({ name: 'Dot', pattern: /\./ });
export const Question = createToken({ name: 'Question', pattern: /\?/ });
export const Star = createToken({ name: 'Star', pattern: /\*/ });
export const Plus = createToken({ name: 'Plus', pattern: /\+/ });
export const Minus = createToken({ name: 'Minus', pattern: /-/ });
export const Arrow = createToken({ name: 'Arrow', pattern: /->/ });
export const DoubleArrow = createToken({ name: 'DoubleArrow', pattern: /=>/ });
export const Exclamation = createToken({ name: 'Exclamation', pattern: /!/ });
export const Slash = createToken({ name: 'Slash', pattern: /\// });

// Comparison operators
export const EqualEqual = createToken({ name: 'EqualEqual', pattern: /==/ });
export const NotEqual = createToken({ name: 'NotEqual', pattern: /!=/ });
export const LessThan = createToken({ name: 'LessThan', pattern: /</ });
export const GreaterThan = createToken({ name: 'GreaterThan', pattern: />/ });
export const LessEqual = createToken({ name: 'LessEqual', pattern: /<=/ });
export const GreaterEqual = createToken({ name: 'GreaterEqual', pattern: />=/ });

// Range operator
export const Range = createToken({ name: 'Range', pattern: /\.\./ });

// Literals
export const StringLiteral = createToken({
  name: 'StringLiteral',
  pattern: /"(?:[^"\\]|\\.)*"/u
});

export const SingleQuoteString = createToken({
  name: 'SingleQuoteString', 
  pattern: /'(?:[^'\\]|\\.)*'/u
});

export const NumberLiteral = createToken({
  name: 'NumberLiteral',
  pattern: /\d+(?:\.\d+)?/u
});

export const BooleanLiteral = createToken({
  name: 'BooleanLiteral',
  pattern: /true|false/u
});

// Identifiers
export const Identifier = createToken({
  name: 'Identifier',
  pattern: /[a-zA-Z_][a-zA-Z0-9_]*/u
});

export const QualifiedIdentifier = createToken({
  name: 'QualifiedIdentifier',
  pattern: /[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*/u
});

// Comments
export const LineComment = createToken({
  name: 'LineComment',
  pattern: /#[^\r\n]*/u,
  group: Lexer.SKIPPED
});

export const SlashComment = createToken({
  name: 'SlashComment', 
  pattern: /\/\/[^\r\n]*/u,
  group: Lexer.SKIPPED
});

export const BlockComment = createToken({
  name: 'BlockComment',
  pattern: /\/\*[\s\S]*?\*\//u,
  group: Lexer.SKIPPED
});

// Whitespace
export const WhiteSpace = createToken({
  name: 'WhiteSpace',
  pattern: /\s+/u,
  group: Lexer.SKIPPED
});

// Define the order of tokens (keywords must come before Identifier)
export const allTokens: TokenType[] = [
  // Comments and whitespace first
  LineComment,
  SlashComment,
  BlockComment,
  WhiteSpace,
  
  // Keywords (longer first to avoid conflicts)
  Collapsible, Conflicts, Workflow, Include, Grants, Except, Fields,
  Initial, Columns, Filters, Layout, Group, Entity, Action, Module, 
  Form, Role, View, List, Policy, After, Mask, Sort, Page, Desc, Asc,
  Erp, Use, Pack, For, When, Doc, Emit, Call, On, Do, Pk,
  
  // Data types (longer first)
  DateTime, Decimal, Address, Email, Phone, Money, Bool, Date, 
  Text, Code, Json, Enum, Tag, Int,
  
  // Operators (multi-character first)
  DoubleArrow, Arrow, EqualEqual, NotEqual, LessEqual, GreaterEqual,
  Range,
  
  // Single character operators
  LCurly, RCurly, LParen, RParen, LBracket, RBracket,
  Comma, Colon, Semicolon, Equals, Dot, Question, Star, Plus, Minus,
  LessThan, GreaterThan, Exclamation, Slash,
  
  // Literals
  BooleanLiteral, NumberLiteral, StringLiteral, SingleQuoteString,
  
  // Identifiers (must be last)
  QualifiedIdentifier, Identifier
];

export const erpLexer = new Lexer(allTokens, {
  positionTracking: 'full',
  ensureOptimizations: false // Отключаем оптимизации для лучшей поддержки Unicode
}); 