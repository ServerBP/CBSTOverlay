

<script lang="ts">
    import Background from "$lib/overlay/Background.svelte";
    import Container from "$lib/Container.svelte";
</script>

<Background>
    <div class="page-center">
        <h1 class="dotsfont uppercase text-9xl mb-4 casters-text">CASTERS</h1>
        <Container width="60rem" height="20rem" lineColor="#404040" plusColor="#f0f0f0">
            <div class="middle-space"></div>
        </Container>
    </div>
</Background>

<style>
    .page-center {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        display: flex;
        flex-direction: column;
    }

    .middle-space {
        width: 100%;
        height: 100%;
    }

    .casters-text {
        color: #ffffff;
        font-weight: 400;
        outline-color: black;
    }
</style>