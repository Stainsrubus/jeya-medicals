<script>
  import { goto } from '$app/navigation';
  import { _axios } from '$lib/_axios';
  import { writableGlobalStore } from '$lib/stores/global-store';
  import Icon from '@iconify/svelte';
  import { createMutation } from '@tanstack/svelte-query';
    import { onMount } from 'svelte';
  import { toast } from 'svelte-sonner';
  
    let email = '';
    let password = '';
    let showPassword = false;
    let emailError = '';
    let passwordError = '';
  
    function validateEmail() {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email) {
        emailError = 'Email is required';
      } else if (!emailPattern.test(email)) {
        emailError = 'Invalid email format';
      } else {
        emailError = '';
      }
    }
  
    function validatePassword() {
      if (!password) {
        passwordError = 'Password is required';
      } else if (password.length < 4) {
        passwordError = 'Password must be at least 4 characters';
      } else {
        passwordError = '';
      }
    }
    const loginMutation = createMutation({
    mutationFn: async () => {

      const response = await _axios.post(
        '/auth/login',
        {
          email: email,
          password: password
        },
        {
          headers: {'Content-Type': 'application/json' },
        }
      );

      if (!response.data.status) {
        throw new Error(response.data.message || 'Failed to login');
      }
      return response.data;
    },
    onSuccess: (data) => {
      writableGlobalStore.set({
        empDetails: {
          image: data.data.empDetails.image,
          email: data.data.empDetails.email,
          mobile: data.data.empDetails.mobile,
          name: data.data.empDetails.name,
          empId: data.data.empDetails.empId
        },
        isLoggedIn: true,
        token: data.data.token
      });
      toast.success('Logged In successfully!');
      goto(`/employee/products`);
    },
    onError: (error) => {
        console.log(error)
      toast.error(error.response.data.message || 'Failed to LogIn');
    },
  });
  
    function handleLogin() {
      validateEmail();
      validatePassword();
      if (!emailError && !passwordError) {
      $loginMutation.mutate(); // Trigger the mutation
    }
    }
  
    onMount(() => {
      const loginContainer = document.querySelector('.login-container');
      loginContainer.classList.add('animate-fadeIn');
    });
  </script>
  
  <style>
    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
  
    .animate-fadeIn {
      animation: fadeIn 1s ease-in-out;
    }
  </style>
  
  <div class="flex min-h-screen">
    <div class="w-1/2 bg-gray-100 flex items-center justify-center">
      <img src="/logo.png" alt="Login Image" class="" />
    </div>
    <div class="w-1/2 flex items-center justify-center login-container">
      <div class="bg-white   w-full max-w-md">
        <h2 class="text-2xl font-bold mb-6 text-left">Login</h2>
        <div class="mb-4">
          <label for="email" class="block text-gray-700">Email</label>
          <input
            type="email"
            id="email"
            bind:value={email}
            on:blur={validateEmail}
            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
            placeholder="Enter your email"
          />
          {#if emailError}
            <p class="text-red-500 text-sm mt-1">{emailError}</p>
          {/if}
        </div>
        <div class="mb-4">
          <label for="password" class="block text-gray-700">Password</label>
          <div class="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              bind:value={password}
              on:blur={validatePassword}
              class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="Enter your password"
            />
            <button
              type="button"
              on:click={() => (showPassword = !showPassword)}
              class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 focus:outline-none"
            >
              {#if showPassword}
          <Icon icon={'mdi:eye'} class="w-4 h-4 ml-2" />
               
              {:else}
          <Icon icon={'mdi:eye-off'} class="w-4 h-4 ml-2" />
               
              {/if}
            </button>
          </div>
          {#if passwordError}
            <p class="text-red-500 text-sm mt-1">{passwordError}</p>
          {/if}
        </div>
        <button
          on:click={handleLogin}
          class="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 focus:outline-none"
        >
          Login
        </button>
      </div>
    </div>
  </div>
  