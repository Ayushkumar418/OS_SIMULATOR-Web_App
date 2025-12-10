"""Memory management package"""

from .paging import PagingManager
from .page_replacement import PageReplacementAlgorithm, FIFOReplacement, LRUReplacement, OptimalReplacement

__all__ = [
    'PagingManager',
    'PageReplacementAlgorithm',
    'FIFOReplacement',
    'LRUReplacement',
    'OptimalReplacement'
]
