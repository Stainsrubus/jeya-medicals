<script lang="ts">
            import Topbar from '$lib/components/topbar.svelte';
              let { children } = $props();
</script>
          
        
          <div>
            <Topbar />
            {@render children()}
          </div>
          