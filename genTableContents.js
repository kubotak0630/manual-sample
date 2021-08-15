// 記事中の見出しタグ（h2, h3, h4）を抽出し、それぞれの内容から目次を自動作成
// 目次は3階層(h2-h3-h4)まで対応。
// 抽出先にはIDを振らなくていい。自動でIDは付加して目次からリンクを作成する

/* 自動生成される目次(h2,h3の例)
<ul>
  <li><a href="id">H2_1</li>
  <li><a href="id">H2_2
    <ul>
      <li><a href="id">H2_2_1</li>
      <li><a href="id">H2_2_2</li>
    </ul>
  </li>
  <li><a href="id">H2_3</li>
</ul>
*/

const searchClass = 'main'; // 抽出先のクラス名, このクラス内のh2,h3,h4,h5 が見出しの対象
const targetTocId = 'toc'; // 作成する目次Elementのid, html側に<div id="toc"> を用意しておく
const isFigAnnotation = true; // 図の下に説明分を自動挿入する場合はtrue
const useHeaderOffset = true; //アンカーリンクでheaderオフセットをもたせる場合はtrue

// ヘッダーを上部に固定した場合はアンカーリンクにオフセットをもたせる必要あるのでこの関数でオフセットを付加
// <a>要素のclickイベントを上書きする
const setAnkerLinkbyOffset = (offsetY, isSmooth) => {
  const anchorLinks = document.querySelectorAll(`#${targetTocId} a[href^="#"]`); //anchorLinks: NodeListOf<Element>
  // NodeListOf<Element>はforEachが使えるので変換する必要はないは安全のため変換
  // const anchorLinksArr = Array.prototype.slice.call(anchorLinks); //配列風オブジェクトを配列に変換するメジャーな書き方

  const behavior = isSmooth ? 'smooth' : 'auto';
  anchorLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.hash;
      const targetElement = document.querySelector(targetId);
      const targetOffsetTop = window.pageYOffset + targetElement.getBoundingClientRect().top;
      window.scrollTo({
        top: targetOffsetTop - offsetY,
        behavior: behavior,
      });
    });
  });
};

/**
 * <img src="xxx", alt="aaa">　要素を検出して altが設定している場合にはFig番号を図の下にいれる
 * 図の下中央に入れたいのでdivでwrappして、css側で設定をあてる
 *
 *
 * <div="fig-wapper">  //このwapper divを追加
 *   <img src="xxx", alt="aaa">
 *   <div class="fig-annotation">figx-x. aaa</div>    //fig番号を追加
 * </div>
 *
 *
 */
const insertFigAnnotation = () => {
  // const elements = document.querySelectorAll('.main img, ');
  // 図に章番号も付加したいのでh2,h3,h4も検出する
  const elements = document.querySelectorAll(
    `.${searchClass} img, .${searchClass} h2, .${searchClass} h3, .${searchClass} h4`
  );
  // console.log(elements);

  // 目次の初期値(-1下値を入れる)
  const tableNum = [0, 0, 0]; //h2, h3, h4
  let nowHierarchy = 0; //今、章のどの階層かを示す変数[0,1,2] (h2/h3/h4を0-2で示す)

  let figIndex = 0; //fig1-xxx,  xxxに章ごとの通し番号を降る
  elements.forEach((elem) => {
    if (elem.nodeName === 'IMG') {
      if (elem.alt) {
        // console.log(elem);
        // console.log(elem.alt);

        // 挿入するdiv要素の作成
        const divWraaper = document.createElement('div');
        const divEl = document.createElement('div');
        figIndex++;
        //fig番号の生成
        const figNo = `fig${tableNum[0]}-${figIndex}`;

        divEl.innerHTML = `${figNo}. ${elem.alt}`;
        divEl.classList.add('fig-annotation');

        // １つ前の要素を取得
        const preElem = elem.previousElementSibling;

        // 親要素を取得
        const parentElem = elem.parentNode;

        // 一旦<img>をNodeから削除
        parentElem.removeChild(elem);

        divWraaper.appendChild(elem);
        divWraaper.appendChild(divEl);
        divWraaper.classList.add('fig-wapper');

        if (preElem) {
          parentElem.insertBefore(divWraaper, preElem.nextSibling);
        }
        // <img>が <div><img></div>のようにラップされている場合
        else {
          parentElem.appendChild(divWraaper);
        }
      }
    }
    // h2/h3/h4
    else {
      //hの後ろの数字を取得(-2する)
      const hIndex = Number(elem.nodeName[1]) - 2;

      //章ごとの通し番号のリセット(h2でリセット)
      if (elem.nodeName === 'H2') {
        figIndex = 0;
      }

      nowHierarchy = hIndex;
      // console.log(`hIndex=${hIndex}`);
      tableNum[hIndex]++;
    }
  });
};

// mainクラス中のh2, h3, h4から目次(SubMenu)を自動生成する
const createTableContents = () => {
  const contentsList = document.getElementById(targetTocId); // 目次を追加する先
  const divEl = document.createElement('div'); // 作成する目次のコンテナ要素
  divEl.id = 'toc-gen';

  // .entry-content配下のh2、h3, h4要素を全て取得する
  const elements = document.querySelectorAll(
    `.${searchClass} h2, .${searchClass} h3, .${searchClass} h4`
  );
  // console.log(elements);

  // 取得した見出しタグ要素の数だけ以下の操作を繰り返す
  elements.forEach((elem, i) => {
    // idを付加, idは一位であればいいのでid='Hx_i' とする
    elem.id = `${elem.nodeName}_${i}`; //nodeName: 'H2 | 'H3' | 'H4'

    // 追加する<li><a>タイトル</a></li>を準備する
    const li = document.createElement('li');
    const a = document.createElement('a');

    a.innerHTML = elem.textContent;
    a.href = '#' + elem.id;
    li.appendChild(a);

    if (elem.nodeName === 'H2') {
      if (divEl.lastElementChild == null) {
        // コンテナ要素である<div>の中に<ul><li><a>タイトル</a></li></ul>要素を追加する
        const ul = document.createElement('ul');
        ul.classList.add(`toc-${elem.nodeName.toLowerCase()}`);
        ul.appendChild(li);
        divEl.appendChild(ul);
      } else {
        // コンテナ要素である<div>の中から最後の<ui>を取得する。
        const lastUl = divEl.lastElementChild;

        // 最後の<li>の中に要素を追加する
        lastUl.appendChild(li);
      }
    } else {
      let lastLi;
      // H3,H4から数字を取得して汎用的に書くことも可能だが、わかりやすくベタ書きにする
      if (elem.nodeName === 'H3') {
        // コンテナ要素である<div>の中から最後の<li>を取得する。(div-ul-li ,必ず取得できる)
        lastLi = divEl.lastElementChild.lastElementChild;
      } else {
        // コンテナ要素である<div>の中から最後の<li>を取得する。(div-ul-li-ul-li ,必ず取得できる)
        lastLi = divEl.lastElementChild.lastElementChild.lastElementChild.lastElementChild;
      }

      // 最後のelementを取得して、これが<ul>かどうかを判定する。　<ul>でない場合は<ul>付きで挿入
      const lastElem = lastLi.lastElementChild;

      if (lastElem.nodeName === 'UL') {
        // lastElemは<ul>, <li>要素を最後に追加する
        lastElem.appendChild(li);
      } else {
        // <ul><li><a>タイトル</a></li></ul>要素を追加する
        const ul = document.createElement('ul');
        ul.classList.add(`toc-${elem.nodeName.toLowerCase()}`);
        ul.appendChild(li);
        lastLi.appendChild(ul);
      }
    }

    // 最後に追加
    contentsList.appendChild(divEl);
  });
};

// subMenuの分割枠をマウスドラッグで可変可能とする設定
const devideLineDragSetting = () => {
  const devideElem = document.querySelector('.devide-line');

  const MouseMoveHandler = (evt) => {
    // console.log(`call mousemove`);
    const elem = document.querySelector('.sidemenu-content');

    let sideMenuWidth = document.documentElement.clientWidth - evt.clientX;
    let mainWidth = evt.clientX;

    const sideMax = 600; //sideMenuWidthのMax
    const sideMin = 100; //sideMenuWidthのMin

    // sideMenuWidthのMin制限
    if (sideMenuWidth < sideMin) {
      sideMenuWidth = sideMin;
      mainWidth = document.documentElement.clientWidth - sideMin;
      document.querySelector('body').classList.add('drag-limit-right');
    }
    // sideMenuWidthはMaxのMax制限
    else if (sideMenuWidth > sideMax) {
      sideMenuWidth = sideMax;
      mainWidth = document.documentElement.clientWidth - sideMax;
      document.querySelector('body').classList.add('drag-limit-left');
    }

    // side-menuの幅変更
    elem.style.width = `${sideMenuWidth}px`;

    // main-windowの幅変更
    document.querySelector('.main').style.width = `${mainWidth}px`;
  };

  devideElem.addEventListener('mousedown', (evt) => {
    nowMove = true;
    // console.log('call mousedown');
    // カーソルをドラッグ中は変更するためにnow-dragクラスをbodyに追加
    document.querySelector('body').classList.add('now-drag');
    devideElem.classList.add('now-drag');
    // マウスmoveハンドラをdocumentに登録(瞬間的にマウスは外れるため), このハンドラはマウスUpイベントで削除する
    document.addEventListener('mousemove', MouseMoveHandler);
  });

  // マウスUpイベントはdocumentに登録(画面が外へのマウス移動でなどで外れる場合もあるため)
  document.addEventListener('mouseup', () => {
    // console.log('call mouseup');
    document.removeEventListener('mousemove', MouseMoveHandler);
    const bodyElem = document.querySelector('body');
    bodyElem.classList.remove('now-drag');
    devideElem.classList.remove('now-drag');
    bodyElem.classList.remove('drag-limit-right');
    bodyElem.classList.remove('drag-limit-left');
  });
};

/* 本スクリプトの本体 */
document.addEventListener('DOMContentLoaded', () => {
  // 見出しの自動生成
  createTableContents();

  // 固定ヘッダーを使っている場合にはアンカーリンクのジャンプ先がずれるので、オフセットを設定
  // Anker-Linkのclickイベントを上書きする
  if (useHeaderOffset) {
    const linkOffsetY = document.querySelector('header h1').clientHeight + 10;
    setAnkerLinkbyOffset(linkOffsetY, true);
  }

  // figに自動で説明(図下にfig1. xxx)を入れる設定
  if (isFigAnnotation) {
    insertFigAnnotation();
  }

  // subMenuの分割枠をマウスドラッグで可変可能とする設定
  devideLineDragSetting();
});

// htmlのsubMenuのクリックイベント
const sideMenuClick = () => {
  const checked = document.querySelector('#openSidebarMenu').checked;
  console.log(checked);
  // 閉じる

  const elemSideMenu = document.querySelector('.sidemenu-content');
  const elemMain = document.querySelector('.main');

  const settingWidth = window.getComputedStyle(elemSideMenu).getPropertyValue('width');
  // sideMene-OFF
  if (!checked) {
    elemSideMenu.style.transform = `translateX(${settingWidth})`;
    // console.log(`set translateX(${settingWidth})`);

    // main windowのwidth変更
    elemMain.style.width = '100%';
    console.log('set main width 100%');
  }
  // sideMene-ON
  else {
    elemSideMenu.style.transform = 'translateX(0)';
    console.log('set translateX(0)');

    // mainのwidth変更
    const h = document.documentElement.clientWidth - parseInt(settingWidth);
    // console.log(`h=${h}`);
    document.querySelector('.main').style.width = `${h}px`;
  }
};
