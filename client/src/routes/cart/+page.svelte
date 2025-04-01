<script>
    // Define the cart items as an array of objects
    let cartItems = [
      {
        name: "Bumsuit Premium Baby Pants (Mosquito Protection)",
        size: "S",
        count: 86,
        price: 9999.99,
        discount: 50,
        total: 9999.99,
        quantity: 2,
      },
      {
        name: "Bumsuit Premium Baby Pants (Mosquito Protection)",
        size: "S",
        count: 86,
        price: 9999.99,
        discount: 50,
        total: 9999.99,
        quantity: 2,
      },
    ];
  
    // Function to update quantity
    function updateQuantity(index, change) {
      cartItems[index].quantity = Math.max(1, cartItems[index].quantity + change);
      cartItems = [...cartItems]; // Trigger reactivity
    }
  
    // Calculate totals for the bill summary
    $: totalAmount = cartItems.reduce((sum, item) => sum + item.total * item.quantity, 0);
    $: totalDiscount = cartItems.reduce((sum, item) => sum + item.discount * item.quantity, 0);
  </script>
  
  <div class="container">
    <!-- Cart Items Section -->
    <div class="cart-items">
      <div class="cart-header">
        <span style="width: 40%;">PRODUCTS</span>
        <span style="width: 15%; text-align: center;">SIZE</span>
        <span style="width: 15%; text-align: center;">COUNT</span>
        <span style="width: 15%; text-align: center;">PRICE</span>
        <span style="width: 15%; text-align: center;">DISCOUNT</span>
        <span style="width: 15%; text-align: center;">TOTAL</span>
        <span style="width: 15%; text-align: center;">QUANTITY</span>
      </div>
  
      {#each cartItems as item, index}
        <div class="cart-item">
          <img src="placeholder.png" alt="Product Image" />
          <div class="item-details">
            <p>{item.name}</p>
            <p class="size">{item.size}</p>
          </div>
          <div class="item-price">{item.count}</div>
          <div class="item-price">₹{item.price.toFixed(2)}</div>
          <div class="item-discount">₹{item.discount.toFixed(2)}</div>
          <div class="item-total">₹{item.total.toFixed(2)}</div>
          <div class="quantity">
            <button on:click={() => updateQuantity(index, -1)}>−</button>
            <span>{item.quantity}</span>
            <button on:click={() => updateQuantity(index, 1)}>+</button>
          </div>
        </div>
      {/each}
    </div>
  
    <!-- Billing Section -->
    <div class="billing">
      <h3>Deliver To</h3>
      <p>12A Gandhi street, vadisery, nagercoil, 629001</p>
      <p>☎ Mohan ram - +91 87897657677</p>
      <button class="edit-btn">EDIT ADDRESS</button>
  
      <div class="summary">
        <h3>Bill Summary</h3>
        <div>
          <span>Amount</span>
          <span>₹{totalAmount.toFixed(2)}</span>
        </div>
        <div>
          <span>Delivery Charge</span>
          <span class="free">FREE</span>
        </div>
        <div>
          <span>Discount on MRP</span>
          <span>₹{totalDiscount.toFixed(2)}</span>
        </div>
        <div class="total">
          <span>TOTAL AMOUNT</span>
          <span>₹{(totalAmount - totalDiscount).toFixed(2)}</span>
        </div>
      </div>
      <button class="pay-now-btn">PAY NOW</button>
    </div>
  </div>
  
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      font-family: Arial, sans-serif;
    }
  
    .container {
      display: flex;
      justify-content: space-between;
      max-width: 1200px;
      margin: 0 auto;
      background-color: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      padding: 20px;
    }
  
    .cart-items {
      width: 65%;
    }
  
    .cart-header {
      display: flex;
      justify-content: space-between;
      font-size: 14px;
      color: #666;
      padding-bottom: 10px;
      border-bottom: 1px solid #ddd;
    }
  
    .cart-item {
      display: flex;
      align-items: center;
      padding: 15px 0;
      border-bottom: 1px solid #ddd;
    }
  
    .cart-item img {
      width: 50px;
      height: 50px;
      margin-right: 15px;
      background-color: #f0f0f0;
    }
  
    .item-details {
      flex-grow: 1;
    }
  
    .item-details p {
      margin: 2px 0;
      font-size: 14px;
      color: #333;
    }
  
    .item-details .size {
      color: #666;
    }
  
    .item-price,
    .item-discount,
    .item-total {
      width: 80px;
      text-align: center;
      font-size: 14px;
      color: #333;
    }
  
    .quantity {
      display: flex;
      align-items: center;
      width: 100px;
      justify-content: center;
    }
  
    .quantity button {
      width: 30px;
      height: 30px;
      border: 1px solid #ddd;
      background-color: #fff;
      cursor: pointer;
      font-size: 16px;
    }
  
    .quantity span {
      width: 30px;
      text-align: center;
      font-size: 14px;
    }
  
    .billing {
      width: 30%;
      padding: 20px;
      background-color: #f9f9f9;
      border-radius: 8px;
    }
  
    .billing h3 {
      font-size: 16px;
      color: #333;
      margin-bottom: 10px;
    }
  
    .billing p {
      font-size: 14px;
      color: #666;
      margin-bottom: 5px;
    }
  
    .billing .edit-btn {
      background-color: #007bff;
      color: #fff;
      border: none;
      padding: 5px 10px;
      border-radius: 5px;
      cursor: pointer;
      font-size: 12px;
      float: right;
    }
  
    .billing .summary {
      margin-top: 20px;
    }
  
    .billing .summary div {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      font-size: 14px;
    }
  
    .billing .summary .free {
      color: #28a745;
    }
  
    .billing .summary .total {
      font-weight: bold;
      font-size: 16px;
    }
  
    .pay-now-btn {
      width: 100%;
      padding: 10px;
      background-color: #007bff;
      color: #fff;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 16px;
      margin-top: 20px;
    }
  
    .pay-now-btn:hover {
      background-color: #0056b3;
    }
  </style>