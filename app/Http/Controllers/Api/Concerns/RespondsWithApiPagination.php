<?php

namespace App\Http\Controllers\Api\Concerns;

use App\Support\ApiResponse;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

trait RespondsWithApiPagination
{
    /**
     * @param  class-string  $resourceClass
     */
    private function paginatedResponse(
        string $message,
        LengthAwarePaginator $paginator,
        string $resourceClass,
        Request $request,
    ): JsonResponse {
        return ApiResponse::success(
            $message,
            $resourceClass::collection($paginator->getCollection())->resolve($request),
            [
                'pagination' => [
                    'current_page' => $paginator->currentPage(),
                    'per_page' => $paginator->perPage(),
                    'total' => $paginator->total(),
                    'last_page' => $paginator->lastPage(),
                    'from' => $paginator->firstItem(),
                    'to' => $paginator->lastItem(),
                ],
            ],
        );
    }

    private function perPage(Request $request): int
    {
        return max(1, min(100, (int) $request->integer('per_page', 15)));
    }

    private function sortDirection(Request $request): string
    {
        return $request->query('sort') === 'asc' ? 'asc' : 'desc';
    }
}
