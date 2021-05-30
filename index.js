function parse(template) {
  // 拆开语义化 template拆成数组
  const tokens = tokenizer(template);
  // 数组->树 AST树
  // 数组变成属性结构
  let cur = 0;
  let ast = {
    type: 'root',
    props: [],
    children: []
  };

  while (cur < tokens.length) {
    ast.children.push(walk());
  }
  return ast;
  function walk() {
    let token = tokens[cur];
    if (token.type === 'tagstart') {
      // 开始标签新建一个node
      let node = {
        type: 'element',
        tag: token.val,
        props: [],
        children: []
      };
      token = tokens[++cur];
      // 往下走到tagend or tagstart之中，都是自己的内容
      while (token.type !== 'tagend') {
        if (token.type === 'props') {
          node.props.push(walk());
        } else {
          node.children.push(walk());
        }
        token = tokens[cur];
      }
      cur++;
      return node;
    }

    if (token.type === 'tagend') {
      cur++;
    }
    if (token.type === 'text') {
      cur++;
      return token;
    }
    if (token.type === 'props') {
      cur++;
      // id="name"
      const [key, val] = token.val.split('=');
      return { key, val };
    }
  }
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
      if (type === 'tagend') val = val.slice(2); // 过滤</
      tokens.push({
        type,
        val
      });
      val = '';
    }
  }
}

function transform(ast) {
  // 给通用的ast 加上vue语法标示
  // 包括vue的特定template语法，包挎所谓的静态标记
  let context = {
    helpers: new Set(['openBlock', 'createVnode']) //用到的工具函数
  };

  // 树形结构，递归比较合适的
  traverse(ast, context);
  ast.helpers = context.helpers;
}

function traverse(ast, context) {
  switch (ast.type) {
    case 'root':
      context.helpers.add('createBlock');
    case 'element':
      // props在这里面 1.标记vue的语法 2.class props event 如果是静态的，标记出来，方便后续vdom diff的时候略过
      ast.children.forEach(node => {
        traverse(node, context);
      });
      // 先不整位运算，整个对象好理解
      ast.flag = { props: false, class: false, event: false }; // 默认都是静态的
      ast.props = ast.props.map(prop => {
        const { key, val } = prop;
        if (key[0] === '@') {
          // 事件
          ast.flag.event = true; // 后续做节点对比的时候，需要对事件进行diff, 先removeEventListener, 再addEventListener
          return {
            key: 'on' + key[1].toUpperCase() + key.slice(2), // @click => onClick
            val: val.replace(/['"]/g, '')
          };
        }
        if (key[0] === ':') {
          // 动态属性
          ast.flag.props = true;
          return {
            key: key.slice(1),
            val: val.replace(/['"]/g, '')
          };
        }
        if (key.startsWith('v-')) {
        }
        // 以上都没有
        return { ...prop, static: true };
      });
    case 'text':
      // 文本节点需要知道{{}}，有这个就是动态的，没这个就是静态的
      let re = /{{(.*)}}/g;
      if (re.test(ast.val)) {
        ast.static = false;
        context.helpers.add('toDisplayString');
        ast.val = ast.val.replace(re, function(s0, s1) {
          return s1;
        });
      } else {
        ast.static = true; // 标记为true，后续vue进行dom diff的时候直接略过
      }
  }
}

function genrate(ast) {
  const { helpers } = ast;
  let code = `import {${[...helpers].map(v => v + ' as _' + v)}} from "vue"
  export function render(_ctx, _cache) {
    return (_openBlock(), ${ast.children.map(node => walk(node))})
  }
  `;

  return code;
  function walk(node) {
    switch (node.type) {
      case 'element':
        let { flag } = node;
        let props =
          '{' +
          node.props
            .reduce((ret, p) => {
              if (flag.props) {
                // 属性是动态的
                ret.push(p.key + ':_ctx.' + p.val);
              } else {
                ret.push(p.key + ':' + p.val);
              }
              return ret;
            }, [])
            .join(',') +
          '}';
        return `_createVnode("${node.tag}",${props},[${node.children.map(n =>
          walk(n)
        )}],${JSON.stringify(flag)})`;
      case 'text':
        if (node.static) {
          return '"' + node.val + '"';
        } else {
          return `_toDisplayString(_ctx.${node.val})`;
        }
    }
  }
}

function ll(data) {
  console.log(JSON.stringify(data, null, 2));
}

function compile(template) {
  let ast = parse(template);
  transform(ast);
  const code = genrate(ast);
  ll(code);
  // return code
}

const tenmplate = `<div id="app">
<h1 @click="add" class="item" :id="count">{{count}}</h1>
<p>今日摸鱼真快乐</p>
</div>`;

let code = compile(tenmplate);
