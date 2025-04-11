<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { baseUrl } from '$lib/config';
  import { toast } from 'svelte-sonner';
  import { writableGlobalStore } from '$lib/stores/global-store';
  let otplessCallback;

  // Function to call backend API
  /**
	 * @param {any} mobileNumber
	 */
  async function loginWithBackend(mobileNumber) {
    try {
      const response = await fetch(`${baseUrl}/userauth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mobile: mobileNumber }),
      });

      if (![200, 201].includes(response.status)) {
        console.error('Login failed: Invalid response status:', response.status);
        return false;
      }

      const data = await response.json();

      if (data.status) {
        writableGlobalStore.update(store => ({
          ...store,
          userDetails: {
            profileImage: data.data.userDetails.profileImage || '',
            userName: data.data.userDetails.userName || '',
            mobile: data.data.userDetails.mobile || ''
          },
          isLogedIn: true
        }));
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('_id', data.data.userDetails.userId);
        localStorage.setItem('userData', JSON.stringify(data.data.userDetails));
        
        console.log('Stored token:', data.data.token);
        return true;
      } else {
        console.error('Login failed:', data.message || 'Unknown error');
        return false;
      }
    } catch (error) {
      console.error('API call failed:', error);
      return false;
    }
  }

  function hideOtplessUI() {
    const otplessUI = document.getElementById('otpless-login-page');
    if (otplessUI) {
      otplessUI.style.display = 'none';
    }
  }

  function showOtplessUI() {
    const otplessUI = document.getElementById('otpless-login-page');
    if (otplessUI) {
      otplessUI.style.display = 'block';
    }
  }

  onMount(() => {
    otplessCallback = async (/** @type {{ identities: { identityValue: string; }[]; status: string; }} */ otplessUser) => {
      console.log('OTPless response:', otplessUser);
      hideOtplessUI();

      if (!otplessUser?.identities?.[0]) {
        console.error('Invalid OTPless response:', otplessUser);
        toast.error('Login failed due to invalid response. Please try again.');
        showOtplessUI();
        return;
      }

      const mobileNumber = otplessUser.identities[0].identityValue.replace('91', '');
      console.log('mobileNumber', mobileNumber);

      if (otplessUser.status !== 'SUCCESS') {
        console.error('OTP verification failed or status not successful');
        toast.error('OTP verification failed. Please try again.');
        showOtplessUI();
        return;
      }

      try {
        const loginSuccess = await loginWithBackend(mobileNumber);
        
        if (loginSuccess) {
          console.log('Login successful!');
          
          // Verify token is stored before navigation
          const storedToken = localStorage.getItem('userToken');
          console.log('Token verification:', storedToken);
          
          if (storedToken) {
            // Add slight delay to ensure storage is complete
            setTimeout(() => {
              goto('/', { replaceState: true });
            }, 100);
          } else {
            throw new Error('Token not stored properly');
          }
        } else {
          throw new Error('Login failed');
        }
      } catch (error) {
        console.error('Login process failed:', error);
        toast.error('Login failed. Please try again.');
        showOtplessUI();
      }
    };

    window.otpless = otplessCallback;

    return () => {
      delete window.otpless;
    };
  });
</script>

<svelte:head>
  <title>Login</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script
    id="otpless-sdk"
    type="text/javascript"
    src="https://otpless.com/v3/auth.js"
    data-appid="BZFS6IIDYH2KV80MB6OH"
    data-callback="otpless"
    data-skip-success="true"
  ></script>
</svelte:head>

<section class="flex justify-center items-center w-full h-[85vh]">
  <div id="otpless-login-page"></div>
</section>

<style>
  .flex {
    display: flex;
  }
  .justify-center {
    justify-content: center;
  }
  .items-center {
    align-items: center;
  }
  .w-full {
    width: 100%;
  }
</style>