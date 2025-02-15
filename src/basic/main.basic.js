import {
  BULK_DISCOUNT,
  DAY,
  DISCOUNT,
  FLASH_SALE_DELAY_TIME,
  FLASH_SALE_DISCOUNT,
  FLASH_SALE_INTERVAL_TIME,
  FLASH_SALE_PROBABILITY,
  LOW_STOCK,
  MIN_DISCOUNT_QUANTITY,
  MIN_FLASH_SALE_QUANTITY,
  POINT_BASE,
  BUNDLE_SALE_DELAY_TIME,
  BUNDLE_SALE_DISCOUNT,
  BUNDLE_SALE_INTERVAL_TIME,
  TUESDAY_DISCOUNT
} from '../constants/index.js';
import Cart from '../components/Cart.js';
import ItemSelectOption from '../components/ItemSelectOption.js';
import CartItem from '../components/CartItem.js';
import Points from '../components/Points.js';

let points,
  products,
  selectedProduct,
  total = 0,
  productCount = 0;

function renderElement(id, html) {
  const $el = document.getElementById(id);

  if ($el) {
    $el.innerHTML = html;
  }

  return $el;
}

function renderItemSelectOptions() {
  renderElement('product-select', products.map(ItemSelectOption).join(''));
}

function calcCart() {
  total = 0;
  productCount = 0;
  let cartProducts = $cartProducts.children;
  let totalBeforeDiscount = 0;
  for (let i = 0; i < cartProducts.length; i++) {
    (function () {
      let currentProduct;
      for (let j = 0; j < products.length; j++) {
        if (products[j].id === cartProducts[i].id) {
          currentProduct = products[j];
          break;
        }
      }

      let quantity = parseInt(
        cartProducts[i].querySelector('span').textContent.split('x ')[1]
      );
      let currentProductTotal = currentProduct.price * quantity;
      let discountRate = 0;
      productCount += quantity;
      totalBeforeDiscount += currentProductTotal;
      if (quantity >= MIN_DISCOUNT_QUANTITY) {
        if (currentProduct.id === 'p1') discountRate = DISCOUNT.p1;
        else if (currentProduct.id === 'p2') discountRate = DISCOUNT.p2;
        else if (currentProduct.id === 'p3') discountRate = DISCOUNT.p3;
        else if (currentProduct.id === 'p4') discountRate = DISCOUNT.p4;
        else if (currentProduct.id === 'p5') discountRate = DISCOUNT.p5;
      }
      total += currentProductTotal * (1 - discountRate);
    })();
  }
  let discountRate = 0;
  if (productCount >= MIN_FLASH_SALE_QUANTITY) {
    let bulkDiscount = total * BULK_DISCOUNT;
    let productDiscount = totalBeforeDiscount - total;
    if (bulkDiscount > productDiscount) {
      total = totalBeforeDiscount * (1 - BULK_DISCOUNT);
      discountRate = BULK_DISCOUNT;
    } else {
      discountRate = (totalBeforeDiscount - total) / totalBeforeDiscount;
    }
  } else {
    discountRate = (totalBeforeDiscount - total) / totalBeforeDiscount;
  }

  if (new Date().getDay() === DAY.TUESDAY) {
    total *= 1 - TUESDAY_DISCOUNT;
    discountRate = Math.max(discountRate, TUESDAY_DISCOUNT);
  }
  $cartTotal.textContent = `총액: ${Math.round(total)}원`;
  if (discountRate > 0) {
    let span = document.createElement('span');
    span.className = 'text-green-500 ml-2';
    span.textContent = `(${(discountRate * 100).toFixed(1)}% 할인 적용)`;
    $cartTotal.appendChild(span);
  }
  updateStockStatusMessage();
  renderPoints();
}
function renderPoints() {
  points = +Math.floor(total / POINT_BASE);
  renderElement('loyalty-points', Points(points));
}

function updateStockStatusMessage() {
  let message = '';
  products.forEach(function (product) {
    if (product.quantity < LOW_STOCK) {
      message += `${product.name}: ${
        product.quantity > 0 ? `재고 부족 (${product.quantity}개 남음)` : '품절'
      }\n`;
    }
  });
  $stockStatus.textContent = message;
}
main();
$addToCartButton.addEventListener('click', function () {
  let selectedOption = $productSelect.value;
  let productToAdd = products.find(function (product) {
    return product.id === selectedOption;
  });
  if (productToAdd && productToAdd.quantity > 0) {
    let $cartProduct = document.getElementById(productToAdd.id);
    if ($cartProduct) {
      let updatedQuantity =
        parseInt(
          $cartProduct.querySelector('span').textContent.split('x ')[1]
        ) + 1;
      if (updatedQuantity <= productToAdd.quantity) {
        $cartProduct.querySelector('span').textContent =
          `${productToAdd.name} - ${productToAdd.price}원 x ${updatedQuantity}`;
        productToAdd.quantity--;
      } else {
        alert('재고가 부족합니다.');
      }
    } else {
      addToCart(productToAdd);
    }
    calcCart();
    selectedProduct = selectedOption;
  }
});

function addToCart(productToAdd) {
  const $cartItems = document.getElementById('cart-items');

  $cartItems.insertAdjacentHTML('beforeend', CartItem(productToAdd));

  productToAdd.quantity--;
}

$cartProducts.addEventListener('click', function (event) {
  let target = event.target;

  if (
    target.classList.contains('quantity-change') ||
    target.classList.contains('remove-item')
  ) {
    let selectedProductId = target.dataset.productId;
    let $selectedProduct = document.getElementById(selectedProductId);
    let product = products.find(function (product) {
      return product.id === selectedProductId;
    });
    if (target.classList.contains('quantity-change')) {
      let quantityChange = parseInt(target.dataset.change);
      let updatedQuantity =
        parseInt(
          $selectedProduct.querySelector('span').textContent.split('x ')[1]
        ) + quantityChange;
      if (
        updatedQuantity > 0 &&
        updatedQuantity <=
          product.quantity +
            parseInt(
              $selectedProduct.querySelector('span').textContent.split('x ')[1]
            )
      ) {
        $selectedProduct.querySelector('span').textContent =
          $selectedProduct.querySelector('span').textContent.split('x ')[0] +
          'x ' +
          updatedQuantity;
        product.quantity -= quantityChange;
      } else if (updatedQuantity <= 0) {
        $selectedProduct.remove();
        product.quantity -= quantityChange;
      } else {
        alert('재고가 부족합니다.');
      }
    } else if (target.classList.contains('remove-item')) {
      let remainQuantity = parseInt(
        $selectedProduct.querySelector('span').textContent.split('x ')[1]
      );
      product.quantity += remainQuantity;
      $selectedProduct.remove();
    }
    calcCart();
  }
});

function applyFlashSale() {
  const saleProduct = products[Math.floor(Math.random() * products.length)];
  const isQualified =
    Math.random() < FLASH_SALE_PROBABILITY && saleProduct.quantity > 0;

  if (isQualified) {
    saleProduct.price = Math.round(saleProduct.price * FLASH_SALE_DISCOUNT);

    alert(`번개세일! ${saleProduct.name}이(가) 20% 할인 중입니다!`);

    renderItemSelectOptions();
  }
}

function applyBundleSale() {
  if (!selectedProduct) return;

  const saleProduct = products.find(
    (product) => product.id !== selectedProduct && product.quantity > 0
  );

  if (saleProduct) {
    alert(`${saleProduct.name}은(는) 어떠세요? 지금 구매하시면 5% 추가 할인!`);

    saleProduct.price = Math.round(saleProduct.price * BUNDLE_SALE_DISCOUNT);

    renderItemSelectOptions();
  }
}

function schedulePromotion() {
  setTimeout(
    () => setInterval(applyFlashSale, FLASH_SALE_INTERVAL_TIME),
    Math.random() * FLASH_SALE_DELAY_TIME
  );
  setTimeout(
    () => setInterval(applyBundleSale, BUNDLE_SALE_INTERVAL_TIME),
    Math.random() * BUNDLE_SALE_DELAY_TIME
  );
}

function main() {
  products = [
    { id: 'p1', name: '상품1', price: 10000, quantity: 50 },
    { id: 'p2', name: '상품2', price: 20000, quantity: 30 },
    { id: 'p3', name: '상품3', price: 30000, quantity: 20 },
    { id: 'p4', name: '상품4', price: 15000, quantity: 0 },
    { id: 'p5', name: '상품5', price: 25000, quantity: 10 }
  ];

  renderElement('app', Cart());
  renderItemSelectOptions();
  calcCart();
  schedulePromotion();
}

main();
