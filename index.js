function parse(template) {
  // 拆开语义化 template拆成数组
  const tokens = tokenizer(template);
  console.log(tokens);
  // 数组->树 AST树
  // 数组变成属性结构
  let cur = 0;
  let ast = {
    type: 'root',
    props: [],
    children: []
  };

  while (cur < tokens.length) {
    let token = tokens[cur];
    if (token.type === 'tagstart') {
      // 开始标签新建一个node
      let node = {
        type: 'element',
        tag: token.val,
        props: [],
        children: []
      };
    }
  }

  function walk() {}
}

function tokenizer(input) {
  let tokens = [];
  let type = '';
  let val = '';
  for (let i = 0; i < input.length; i++) {
    let ch = input[i];
    if (ch === '<') {
      push(); // < 开头的字符，语义更换，之前收集的val push到token里
      if (input[i + 1] === '/') {
        type = 'tagend'; // </ 结束标签
      } else {
        type = 'tagstart'; // <div 开始标签
      }
    }
    if (ch === '>') {
      // 标签结束
      push();
      type = 'text';
      continue;
    } else if (/[\s]/.test(ch)) {
      push();
      type = 'props';
      continue;
    }
    val += ch;
  }
  return tokens;
  function push() {
    if (val) {
      if (type === 'tagstart') val = val.slice(1); // 过滤<
      if (type === 'tagend') val = val.slice(2);
      tokens.push({
        type,
        val
      });
      val = '';
    }
  }
}

function transform() {}

function genrate(ast) {}

function compile(template) {
  let ast = parse(template);
  // transform(ast)
  // const code = genrate(ast)
  // return code
}

const tenmplate = `<div id="app">
<h1 @click="add" class="item" :id="count">{{count}}</h1>
<p>今日摸鱼真快乐</p>
</div>`;

let code = compile(tenmplate);
