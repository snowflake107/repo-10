const PREC = {
  COMMENT: -2,
  ASSIGN: 15,
  BOOLEAN: 35,
  RELATIONAL: 40,
  CALL: 50,
  ARITHMETIC: 70,
};

const ID_REGEX = /[a-zA-Z][a-zA-Z0-9_\?!]*/;

module.exports = grammar({
  name: 'magik',

  extras: $ => [
    $.comment,
    /\s/,
  ],

  rules: {
    source_file: $ =>
      prec.left(
        repeat(
          choice(
            $.package,
            $.fragment,
            $._dollar,
          ),
        ),
      ),

    _line_terminator: $ => seq(optional('\r'), '\n'),

    fragment: $ =>
      prec.left(seq(repeat1(seq($._top_level_statement, $._line_terminator)), optional($._dollar))),

    package: $ =>
      prec.left(seq(alias(/_[Pp][Aa][Cc][Kk][Aa][Gg][Ee]/, '_package'), $._identifier, repeat($.fragment))),

    _dollar: $ => token(seq('$', optional('\r'), '\n')),

    _method_declaration: $ =>
      seq(
        optional($.pragma),
        $.method,
      ),

    // [_private] _method <receiver>.<message_name> [( <arguments> )] | // [_private] _method <receiver>'[' <argument list> ']'
    //  <block body>
    // _endmethod
    method: $ =>
      prec.left(
        seq(
          optional(alias(/_[Aa][Bb][Ss][Tt][Rr][Aa][Cc][Tt]/, '_abstract')),
          optional(alias(/_[Pp][Rr][Ii][Vv][Aa][Tt][Ee]/, '_private')),
          optional(alias(/_[Ii][Tt][Ee][Rr]/, '_iter')),
          alias(/_[Mm][Ee][Tt][Hh][Oo][Dd]/, '_method'),
          field('exemplarname', $.identifier),
          choice(
            seq(
              '.', field('name', $.identifier),
              optional(choice(
                seq(
                  '(',
                  optional(seq($.argument, repeat(seq(',', $.argument)))),
                  optional(seq(optional(','), alias(/_[Oo][Pp][Tt][Ii][Oo][Nn][Aa][Ll]/, '_optional'), $._arguments)),
                  optional(seq(optional(','), alias(/_[Gg][Aa][Tt][Hh][Ee][Rr]/, '_gather'), $.argument)),
                  ')', optional(seq(choice('<<', '^<<'), $._arguments))),
                seq('[', optional($._arguments), ']', optional(seq(choice('<<', '^<<'), $._arguments))),
                seq(choice('<<', '^<<'), $._arguments),
              ))),
            seq('[', optional($._arguments), ']', optional(seq(choice('<<', '^<<'), $._arguments)))),
          $._line_terminator,
          optional($.documentation),
          optional($._codeblock),
          alias(/_[Ee][Nn][Dd][Mm][Ee][Tt][Hh][Oo][Dd]/, '_endmethod'),
        ),
      ),

    // [_iter] _proc [@ <identifier>] ( [ <arguments> ] )
    // <block body>
    // _endproc
    procedure: $ =>
      seq(optional(alias(/_[Ii][Tt][Ee][Rr]/, '_iter')), alias(/_[Pp][Rr][Oo][Cc]/, '_proc'),
        optional($.label),
        seq(
          '(',
          optional(seq($.argument, repeat(seq(',', $.argument)))),
          optional(seq(optional(','), alias(/_[Oo][Pp][Tt][Ii][Oo][Nn][Aa][Ll]/, '_optional'), $._arguments)),
          optional(seq(optional(','), alias(/_[Gg][Aa][Tt][Hh][Ee][Rr]/, '_gather'), $.argument)),
          ')', optional(seq(choice('<<', '^<<'), $._arguments)),
        ),
        optional($._codeblock),
        alias(/_[Ee][Nn][Dd][Pp][Rr][Oo][Cc]/, '_endproc'),
      ),

    argument: $ => $._identifier,

    _arguments: $ => prec.right(seq($.argument, repeat(seq(',', $.argument)), optional(','))),

    // _block [ @ <identifier> ]
    //   <statements>
    //   [ >> <rvalue tuple> ]
    // _endblock
    block: $ =>
      prec.left(
        seq(alias(/_[Bb][Ll][Oo][Cc][Kk]/, '_block'), optional($.label), optional($._codeblock), alias(/_[Ee][Nn][Dd][Bb][Ll][Oo][Cc][Kk]/, '_endblock')),
      ),

    assignment: $ =>
      prec.left(PREC.ASSIGN,
        seq($._expression,
          choice('<<', '^<<', '_and<<', '_andif<<', '_or<<', '_orif<<', '_xor<<', '**<<', '**^<<', '*<<', '*^<<', '/<<', '/^<<', '_mod<<', '_div<<', '-<<', '-^<<', '+<<', '+^<<'),
          $._expression),
      ),

    // _if <condition1>
    // _then
    //  <block body>
    // [ _elif <condition2>
    //   _then
    //     <block body> ]
    //     ...
    // [ _else
    //   <block body> ]
    // _endif
    if: $ =>
      seq(alias(/_[Ii][Ff]/, '_if'),
        field('condition', $._expression),
        alias(/_[Tt][Hh][Ee][Nn]/, '_then'),
        optional($._codeblock),
        repeat($.elif),
        optional($.else),
        alias(/_[Ee][Nn][Dd][Ii][Ff]/, '_endif'),
      ),

    elif: $ => seq(alias(/_[Ee][Ll][Ii][Ff]/, '_elif'), field('condition', $._expression), alias(/_[Tt][Hh][Ee][Nn]/, '_then'), optional($._codeblock)),

    else: $ => seq(alias(/_[Ee][Ll][Ss][Ee]/, '_else'), optional($._codeblock)),

    // _loop [ @ <identifier> ]
    //  <block body>
    // _endloop
    loop: $ =>
      seq(
        alias(/_[Ll][Oo][Oo][Pp]/, '_loop'),
        optional($.label),
        optional($._codeblock),
        alias(/_[Ee][Nn][Dd][Ll][Oo][Oo][Pp]/, '_endloop'),
      ),

    // [ _finally [ _with <lvalue tuple> ]
    //  <block body> ]
    finally: $ => seq(alias(/_[Ff][Ii][Nn][Aa][Ll][Ll][Yy]/, '_finally'), optional(seq(alias(/_[Ww][Ii][Tt][Hh]/, '_with'), $._identifier_list)), optional($._codeblock)),

    // _handling condition _with procedure
    handling: $ =>
      prec.left(seq(alias(/_[Hh][Aa][Nn][Dd][Ll][Ii][Nn][Gg]/, '_handling'), choice(
        alias(/_[Dd][Ee][Ff][Aa][Uu][Ll][Tt]/, '_default'),
        seq(field('condition', $._expression), repeat(seq(',', field('condition', $._expression))), alias(/_[Ww][Ii][Tt][Hh]/, '_with'), choice(alias(/_[Dd][Ee][Ff][Aa][Uu][Ll][Tt]/, '_default'), $._expression))),
      )),

    // _catch <expression>
    //  <block body>
    // _endcatch
    catch: $ => seq(alias(/_[Cc][Aa][Tt][Cc][Hh]/, '_catch'), $._expression, $._terminator, optional($._codeblock), alias(/_[Ee][Nn][Dd][Cc][Aa][Tt][Cc][Hh]/, '_endcatch')),

    // _throw <expression> [ _with <rvalue tuple> ]
    throw: $ => prec.left(seq(alias(/_[Tt][Hh][Rr][Oo][Ww]/, '_throw'), $._expression, optional(seq(alias(/_[Ww][Ii][Tt][Hh]/, '_with'), $._expression_list)))),

    // _primitive <number>
    primitive: $ => seq(alias(/_[Pp][Rr][Ii][Mm][Ii][Tt][Ii][Vv][Ee]/, '_primitive'), $.number),

    // [ _for <lvalue tuple> ] _over <iter invocation>
    // _loop [ @<identifier> ]
    //  <block body>
    // [ _finally [ _with <lvalue tuple> ]
    //  <block body> ]
    // _endloop
    iterator: $ =>
      seq(
        optional(seq(alias(/_[Ff][Oo][Rr]/, '_for'), $._identifier_list)),
        alias(/_[Oo][Vv][Ee][Rr]/, '_over'), $._expression,
        seq(
          alias(/_[Ll][Oo][Oo][Pp]/, '_loop'),
          optional($.label),
          optional($._codeblock),
          optional($.finally),
          alias(/_[Ee][Nn][Dd][Ll][Oo][Oo][Pp]/, '_endloop')),
      ),

    // _while <condition>
    // _loop [ @<identifier> ]
    //  <block body>
    // _endloop
    while: $ =>
      seq(alias(/_[Ww][Hh][Ii][Ll][Ee]/, '_while'), field('condition', $._expression),
        seq(
          alias(/_[Ll][Oo][Oo][Pp]/, '_loop'),
          optional($.label),
          optional($._codeblock),
          alias(/_[Ee][Nn][Dd][Ll][Oo][Oo][Pp]/, '_endloop')),
      ),

    // _try [ _with <name list> ]
    //   <block body 0>
    // _when <name list1>
    //   <block body 1>
    // _endtry
    try: $ =>
      seq(
        alias(/_[Tt][Rr][Yy]/, '_try'),
        optional(seq(alias(/_[Ww][Ii][Tt][Hh]/, '_with'), field('condition', $.identifier))),
        optional($._codeblock),
        repeat(seq(alias(/_[Ww][Hh][Ee][Nn]/, '_when'),
          field('raised_condition', $.identifier), repeat(seq(',', field('raised_condition', $.identifier))),
          optional($._codeblock))),
        alias(/_[Ee][Nn][Dd][Tt][Rr][Yy]/, '_endtry'),
      ),

    loopbody: $ =>
      seq(
        alias(/_[Ll][Oo][Oo][Pp][Bb][Oo][Dd][Yy]/, '_loopbody'),
        '(', seq($._expression, repeat(seq(',', $._expression))), ')',
      ),

    // _leave [ @ <identifier> ] [_with <rvalue tuple> ]
    leave: $ =>
      prec.left(seq(
        alias(/_[Ll][Ee][Aa][Vv][Ee]/, '_leave'),
        optional($.label),
        optional(seq(alias(/_[Ww][Ii][Tt][Hh]/, '_with'), choice(
          seq('(', seq($._expression, repeat1(seq(',', $._expression))), ')'),
          seq($._expression, repeat(seq(',', $._expression)))))),
      )),

    // _continue _with <rvalue tuple>
    continue: $ =>
      prec.left(seq(
        alias(/_[Cc][Oo][Nn][Tt][Ii][Nn][Uu][Ee]/, '_continue'),
        optional($.label),
        optional(seq(alias(/_[Ww][Ii][Tt][Hh]/, '_with'), choice(
          seq('(', seq($._expression, repeat1(seq(',', $._expression))), ')'),
          seq($._expression, repeat(seq(',', $._expression)))))),
      )),

    // _protect [ _locking <expression> ]
    //   <block body>
    // _protection
    //   <block body>
    // _endprotect
    protect: $ =>
      seq(
        alias(/_[Pp][Rr][Oo][Tt][Ee][Cc][Tt]/, '_protect'),
        optional(seq(alias(/_[Ll][Oo][Cc][Kk][Ii][Nn][Gg]/, '_locking'), $._expression, $._terminator)),
        optional($._codeblock),
        alias(/_[Pp][Rr][Oo][Tt][Ee][Cc][Tt][Ii][Oo][Nn]/, '_protection'),
        optional($._codeblock),
        alias(/_[Ee][Nn][Dd][Pp][Rr][Oo][Tt][Ee][Cc][Tt]/, '_endprotect'),
      ),

    // _lock <expression>
    //   <block body>
    // _endlock
    lock: $ =>
      seq(
        alias(/_[Ll][Oo][Cc][Kk]/, '_lock'),
        seq($._expression, $._terminator),
        optional($._codeblock),
        alias(/_[Ee][Nn][Dd][Ll][Oo][Cc][Kk]/, '_endlock'),
      ),

    // _pragma (classify_level=<level>, topic={<set of topics>}, [ usage={<set of usages>} ] )
    pragma: $ => prec.left(seq(alias(/_[Pp][Rr][Aa][Gg][Mm][Aa]/, '_pragma'), /(.*)/)),

    _literal: $ =>
      choice(
        $.true,
        $.false,
        $.maybe,
        $.character_literal,
        $.string_literal,
        $.number,
        $.unset,
        $.super,
        $.self,
        $.clone,
        $.symbol,
        $.thisthread,
        $.vector,
      ),

    string_literal: $ =>
      choice(
        seq('"', repeat(choice(/[^"\n]/, /(.|\n)/)), '"'),
        seq('\'', repeat(choice(/[^'\n]/, /(.|\n)/)), '\''),
      ),

    call: $ =>
      prec.right(PREC.CALL,
        seq(
          field('receiver', $._expression),
          field('operator', '.'),
          field('message', $.identifier),
          optional(choice(
            seq('(', optional($._expression_list), ')'),
            seq('<<', optional($._expression_list)))),
        ),
      ),

    invoke: $ => prec.right(PREC.CALL,
      seq(
        field('receiver', $._expression),
        seq('(', optional($._expression_list), ')')),
    ),

    indexed_access: $ =>
      prec.left(PREC.CALL,
        seq(
          field('receiver', $._expression),
          field('index', seq('[', optional($._expression_list), ']')),
        ),
      ),

    slot_accessor: $ => prec.left(seq('.', /[a-zA-Z][a-zA-Z0-9_\?!]*/)),

    _expression_list: $ =>
      prec.right(seq($._expression, repeat(seq(',', $._expression)))),

    true: $ => alias(/_[Tt][Rr][Uu][Ee]/, '_true'),
    false: $ => alias(/_[Ff][Aa][Ll][Ss][Ee]/, '_false'),
    maybe: $ => alias(/_[Mm][Aa][Yy][Bb][Ee]/, '_maybe'),
    unset: $ => alias(/_[Uu][Nn][Ss][Ee][Tt]/, '_unset'),
    super: $ => alias(/_[Ss][Uu][Pp][Ee][Rr]/, '_super'),
    self: $ => alias(/_[Ss][Ee][Ll][Ff]/, '_self'),
    clone: $ => alias(/_[Cc][Ll][Oo][Nn][Ee]/, '_clone'),

    thisthread: $ => alias(/_[Tt][Hh][Ii][Ss][Tt][Hh][Rr][Ee][Aa][Dd]/, '_thisthread'),

    class: $ => seq(alias(/_[Cc][Ll][Aa][Ss][Ss]/, '_class'), field('java_classname', seq(/\|[a-zA-Z\d\.]*\|/))),

    _terminator: $ =>
      choice(';', $._line_terminator),

    _top_level_statement: $ => choice(
      $._definition,
      $._method_declaration,
      $._expression,
      $._global_assignment,
    ),

    _expression: $ => choice(
      $.handling,
      $.return,
      $.leave,
      $.continue,
      $.catch,
      $.throw,
      $.primitive,
      $.block,
      $.iterator,
      $.while,
      $.if,
      $.loop,
      $.try,
      $.loopbody,
      $.protect,
      $.lock,
      choice(
        $.parenthesized_expression,
        $.call,
        $.procedure,
        $.invoke,
        $.slot_accessor,
        $.indexed_access,
        $.gather,
        $.scatter,
        $.allresults,
        $.class,
        $.assignment,
        $.logical_operator,
        $.relational_operator,
        $.arithmetic_operator,
        $.unary_operator,
        $._literal,
        $._variable,
      ),
    ),

    _codeblock: $ => seq(
      choice($._expression, $._defvar),
      repeat(seq($._terminator, choice($._expression, $._defvar))),
      optional($._terminator)),

    _defvar: $ => choice(
      $.local,
      $.constant,
      $.dynamic_import,
      $.dynamic,
      $.global,
      $.import),

    global: $ => seq(alias(/_[Gg][Ll][Oo][Bb][Aa][Ll]/, '_global'), choice($.identifier, $.global_variable, $.dynamic_variable), repeat(seq(',', choice($.identifier, $.global_variable, $.dynamic_variable)))),

    local: $ => prec.left(
      seq(alias(/_[Ll][Oo][Cc][Aa][Ll]/, '_local'),
        choice(
          seq('(', seq($.identifier, optional(seq('<<', $._expression))), repeat(seq(',', seq($.identifier, optional(seq('<<', $._expression))))), ')'),
          seq('(', seq($.identifier, optional(seq('<<', $._expression))), repeat(seq(',', seq($.identifier, optional(seq('<<', $._expression))))), seq(',', alias(/_[Gg][Aa][Tt][Hh][Ee][Rr]/, '_gather'), seq($.identifier, optional(seq('<<', $._expression)))), ')'),
          seq('(', seq(alias(/_[Gg][Aa][Tt][Hh][Ee][Rr]/, '_gather'), $.identifier, optional(seq('<<', $._expression))), ')'),
          seq(seq($.identifier, optional(seq('<<', $._expression))), repeat(seq(',', seq($.identifier, optional(seq('<<', $._expression))))))),
        optional(seq('<<', $._expression)))),

    _global_assignment: $ =>
      seq(
        optional($.pragma),
        alias(/_[Gg][Ll][Oo][Bb][Aa][Ll]/, '_global'), optional(alias(/_[Cc][Oo][Nn][Ss][Tt][Aa][Nn][Tt]/, '_constant')), choice($.identifier, $.dynamic_variable), '<<', $._expression),

    constant: $ =>
      seq(
        choice(
          alias(/_[Cc][Oo][Nn][Ss][Tt][Aa][Nn][Tt]/, '_constant'),
          seq(alias(/_[Cc][Oo][Nn][Ss][Tt][Aa][Nn][Tt]/, '_constant'), alias(/_[Ll][Oo][Cc][Aa][Ll]/, '_local')),
          seq(alias(/_[Ll][Oo][Cc][Aa][Ll]/, '_local'), alias(/_[Cc][Oo][Nn][Ss][Tt][Aa][Nn][Tt]/, '_constant'))),
        choice(
          seq('(', $._identifier_list, ')'),
          $._identifier_list),
        seq('<<', $._expression)),

    dynamic: $ => seq(alias(/_[Dd][Yy][Nn][Aa][Mm][Ii][Cc]/, '_dynamic'), $.dynamic_variable, repeat(seq(',', $.dynamic_variable)), optional(seq('<<', $._expression))),

    import: $ => seq(alias(/_[Ii][Mm][Pp][Oo][Rr][Tt]/, '_import'), $._identifier_list),

    dynamic_import: $ => seq(alias(/_[Dd][Yy][Nn][Aa][Mm][Ii][Cc]/, '_dynamic'), alias(/_[Ii][Mm][Pp][Oo][Rr][Tt]/, '_import'), $.dynamic_variable, repeat(seq(',', $.dynamic_variable))),

    return: $ =>
      prec.right(
        choice(
          seq(alias(/_[Rr][Ee][Tt][Uu][Rr][Nn]/, '_return'), optional($._expression_list)),
          seq('>>', $._expression_list),
        ),
      ),

    _definition: $ =>
      prec(1, seq($.pragma,
        optional($.documentation),
        choice(
          $.invoke,
          $.call)),
      ),

    gather: $ => seq(alias(/_[Gg][Aa][Tt][Hh][Ee][Rr]/, '_gather'), $._expression),
    scatter: $ => seq(alias(/_[Ss][Cc][Aa][Tt][Tt][Ee][Rr]/, '_scatter'), $._expression),
    allresults: $ => seq(alias(/_[Aa][Ll][Ll][Rr][Ee][Ss][Uu][Ll][Tt][Ss]/, '_allresults'), $._expression),

    parenthesized_expression: $ => seq('(', $._expression_list, ')'),

    _variable: $ =>
      choice(
        $.dynamic_variable,
        $.global_variable,
        $.global_reference,
        $.variable,
      ),

    // @ <identifier>
    label: $ =>
      /@\s?[a-zA-Z0-9_\?!]*/,

    variable: $ => prec.left($._identifier),

    dynamic_variable: $ => token(seq(
      optional(seq(ID_REGEX, ':')),
      /![a-zA-Z0-9_\?!]*!/)),

    global_variable: $ => token(seq(ID_REGEX, ':', ID_REGEX)),

    global_reference: $ => token(seq('@', optional(seq(ID_REGEX, ':')), ID_REGEX)),

    identifier: $ => $._identifier,

    _identifier: $ => ID_REGEX,

    _identifier_list: $ =>
      prec.right(seq($.identifier, repeat(seq(',', $.identifier)))),

    number: $ => token(seq(
      choice(/\d+/, /\d+\.\d+/),
      optional(choice(
        seq('e+', /\d+/),
        seq('e', /\d+/))))),

    vector: $ => seq(
      '{',
      optional($._expression_list),
      '}',
    ),

    relational_operator: $ =>
      prec.right(PREC.RELATIONAL,
        seq(
          field('left', $._expression),
          field('operator', choice(alias(/_[Ii][Ss]/, '_is'), alias(/_[Ii][Ss][Nn][Tt]/, '_isnt'), alias(/_[Cc][Ff]/, '_cf'), '=', '~=', '<>', '>=', '<=', '<', '>')),
          field('right', $._expression),
        ),
      ),

    logical_operator: $ =>
      prec.left(PREC.BOOLEAN,
        seq(
          field('left', $._expression),
          field('operator', choice(alias(/_[Aa][Nn][Dd]/, '_and'), alias(/_[Oo][Rr]/, '_or'), alias(/_[Xx][Oo][Rr]/, '_xor'), alias(/_[Aa][Nn][Dd][Ii][Ff]/, '_andif'), alias(/_[Oo][Rr][Ii][Ff]/, '_orif'), alias(/_[Xx][Oo][Rr][Ii][Ff]/, '_xorif'))),
          field('right', $._expression),
        ),
      ),

    arithmetic_operator: $ =>
      prec.left(PREC.ARITHMETIC,
        seq(
          field('left', $._expression),
          field('operator', choice('**', '*', '/', alias(/_[Mm][Oo][Dd]/, '_mod'), alias(/_[Dd][Ii][Vv]/, '_div'), '-', '+')),
          field('right', $._expression),
        ),
      ),

    unary_operator: $ =>
      prec.right(seq(field('operator', choice('+', '-', alias(/_[Nn][Oo][Tt]/, '_not'), '~')), $._expression)),

    symbol: $ => /:(\|[^|]*\||[a-zA-Z0-9_\?!]+)+/,

    character_literal: $ => seq('%', choice($._identifier, /./, ' ')),

    documentation: $ => prec.right(repeat1(/##.*/)),
    comment: $ => token(prec(PREC.COMMENT, /#.*/)),
  },
});
