(function () {
  'use strict';

  let __app_onerror = console.error;

  const safeCall = fn => {
    try {
      return fn?.();
    } catch (e) {
      __app_onerror(e);
    }
  };

  const safeGroupCall = list => {
    try {
      list?.forEach(fn => fn?.());
    } catch (e) {
      __app_onerror(e);
    }
  };

  const safeCallMount = (mountList, destroyList) => {
    mountList.forEach(fn => {
      let r = safeCall(fn);
      r && destroyList.push(r);
    });
  };

  let current_destroyList, current_mountList, current_cd;
  const $onDestroy = fn => fn && current_destroyList.push(fn);

  function WatchObject(fn, cb) {
    this.fn = fn;
    this.cb = cb;
    this.value = NaN;
    this.cmp = null;
  }

  function $watch(fn, callback, option) {
    let w = new WatchObject(fn, callback);
    option && Object.assign(w, option);
    current_cd.watchers.push(w);
    return w;
  }

  function addEvent(el, event, callback) {
    if(!callback) return;
    el.addEventListener(event, callback);

    $onDestroy(() => {
      el.removeEventListener(event, callback);
    });
  }

  function $ChangeDetector(parent) {
    this.parent = parent;
    this.children = [];
    this.watchers = [];
    this.prefix = [];
  }

  const cd_new = () => new $ChangeDetector();

  function $digest($cd, flag) {
    let loop = 10;
    let w;
    while(loop >= 0) {
      let index = 0;
      let queue = [];
      let i, value, cd = $cd, changes = 0;
      while(cd) {
        for(i = 0; i < cd.prefix.length; i++) cd.prefix[i]();
        for(i = 0; i < cd.watchers.length; i++) {
          w = cd.watchers[i];
          value = w.fn();
          if(w.value !== value) {
            flag[0] = 0;
            if(w.cmp) {
              w.cmp(w, value);
            } else {
              w.cb(w.value = value);
            }
            changes += flag[0];
          }
        }
        if(cd.children.length) queue.push.apply(queue, cd.children);
        cd = queue[index++];
      }
      loop--;
      if(!changes) break;
    }
    if(loop < 0) __app_onerror('Infinity changes: ', w);
  }

  let templatecache = {};

  const htmlToFragment = (html, option) => {
    let result = templatecache[html];
    if(!result) {
      let t = document.createElement('template');
      t.innerHTML = html.replace(/<>/g, '<!---->');
      result = t.content;
      if(!(option & 2) && result.firstChild == result.lastChild) result = result.firstChild;
      templatecache[html] = result;
    }

    return option & 1 ? result.cloneNode(true) : result;
  };


  const iterNodes = (el, last, fn) => {
    let next;
    while(el) {
      next = el.nextSibling;
      fn(el);
      if(el == last) break;
      el = next;
    }
  };


  const removeElements = (el, last) => iterNodes(el, last, n => n.remove());


  const resolvedPromise = Promise.resolve();

  function $tick(fn) {
    fn && resolvedPromise.then(fn);
    return resolvedPromise;
  }


  let current_component;


  const makeApply = () => {
    let $cd = current_component.$cd = current_cd = cd_new();
    $cd.component = current_component;

    let planned, flag = [0];
    let apply = r => {
      flag[0]++;
      if(planned) return r;
      planned = true;
      $tick(() => {
        try {
          $digest($cd, flag);
        } finally {
          planned = false;
        }
      });
      return r;
    };

    current_component.$apply = apply;
    current_component.$push = apply;
    apply();
    return apply;
  };


  const makeComponent = (init) => {
    return ($option = {}) => {
      let prev_component = current_component,
        prev_cd = current_cd,
        $component = current_component = { $option };
      current_cd = null;

      try {
        $component.$dom = init($option);
      } finally {
        current_component = prev_component;
        current_cd = prev_cd;
      }

      return $component;
    };
  };


  const addStyles = (id, content) => {
    if(document.head.querySelector('style#' + id)) return;
    let style = document.createElement('style');
    style.id = id;
    style.innerHTML = content;
    document.head.appendChild(style);
  };


  const bindText = (element, fn) => {
    $watch(() => '' + fn(), value => {
      element.textContent = value;
    });
  };


  const bindInput = (element, name, get, set) => {
    let w = $watch(name == 'checked' ? () => !!get() : get, value => {
      element[name] = value == null ? '' : value;
    });
    addEvent(element, 'input', () => {
      set(w.value = element[name]);
    });
  };

  const mount = (label, component, option) => {
    let app, first, last, destroyList = current_destroyList = [];
    current_mountList = [];
    try {
      app = component(option);
      let $dom = app.$dom;
      delete app.$dom;
      if($dom.nodeType == 11) {
        first = $dom.firstChild;
        last = $dom.lastChild;
      } else first = last = $dom;
      label.appendChild($dom);
      safeCallMount(current_mountList, destroyList);
    } finally {
      current_destroyList = current_mountList = null;
    }
    app.destroy = () => {
      safeGroupCall(destroyList);
      removeElements(first, last);
    };
    return app;
  };

  const refer = (active, line) => {
    let result = [], i, v;
    const code = (x, d) => x.charCodeAt() - d;

    for(i = 0; i < line.length; i++) {
      let a = line[i];
      switch (a) {
        case '>':
          active = active.firstChild;
          break;
        case '+':
          active = active.firstChild;
        case '.':
          result.push(active);
          break;
        case '!':
          v = code(line[++i], 48) * 42 + code(line[++i], 48);
          while(v--) active = active.nextSibling;
          break;
        case '#':
          active = result[code(line[++i], 48) * 26 + code(line[++i], 48)];
          break;
        default:
          v = code(a, 0);
          if(v >= 97) active = result[v - 97];
          else {
            v -= 48;
            while(v--) active = active.nextSibling;
          }
      }
    }
    return result;
  };

  var App = makeComponent($option => {
    const $$apply = makeApply();
    let name = 'world';
    {
      const $parentElement = htmlToFragment(`<h1 class="m8emtfe"> </h1><input type="text"/>`, 1);
      let [el3, el0, el2] = refer($parentElement, '++a1.');
      bindText(el0, () => `Hello `+(name)+`!`);
      bindInput(el2, 'value', () => name, a1 => {name = a1; $$apply();});
      addStyles('m8emtfe', `h1.m8emtfe{color:blue}`);
      return $parentElement;
    }
  });

  mount(document.body, App);

})();
