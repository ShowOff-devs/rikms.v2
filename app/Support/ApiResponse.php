<?php

namespace App\Support;

use Illuminate\Http\JsonResponse;

class ApiResponse
{
    /**
     * @param  array<string, mixed>  $meta
     */
    public static function success(string $message, mixed $data = null, array $meta = [], int $status = 200): JsonResponse
    {
        return response()->json([
            'message' => $message,
            'data' => $data,
            'meta' => $meta,
        ], $status);
    }

    /**
     * @param  array<string, mixed>  $errors
     */
    public static function error(string $message, array $errors = [], int $status = 400): JsonResponse
    {
        return response()->json([
            'message' => $message,
            'errors' => $errors,
        ], $status);
    }
}
