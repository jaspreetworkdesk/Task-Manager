<?php
namespace App\Http\Middleware;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
class ManageWorkMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        abort_unless(in_array($request->user()?->role,['admin','manager'],true),403,'Manager access required.');
        return $next($request);
    }
}
