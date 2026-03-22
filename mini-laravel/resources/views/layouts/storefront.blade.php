<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>@yield('title', config('app.name'))</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" crossorigin="anonymous">
    <link rel="stylesheet" href="{{ asset('css/loader.css') }}">
    <style>
      .theme-toggle-btn { display: inline-flex; align-items: center; justify-content: center; line-height: 1; }
      .theme-toggle-btn .fa-circle-half-stroke { font-size: 1.1rem; opacity: 0.92; }
    </style>
    @stack('styles')
</head>
<body data-theme="light">
<script>
(function () {
  try {
    var t = localStorage.getItem('theme');
    if (t === 'dark' || t === 'light') document.body.setAttribute('data-theme', t);
  } catch (e) {}
})();
function toggleTheme() {
  var b = document.body;
  var next = b.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  b.setAttribute('data-theme', next);
  try { localStorage.setItem('theme', next); } catch (e) {}
}
</script>
@include('partials.page-loader')
@yield('content')
<script src="{{ asset('js/loader.js') }}" defer></script>
</body>
</html>
