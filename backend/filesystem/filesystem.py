"""
Simplified file system simulation with block-level visualization.
Demonstrates file operations and block allocation.
"""

from typing import Dict, List, Optional, Tuple
from models import FileSystemEntry
import time


class FileSystem:
    """
    Simulates a simple block-based file system.
    Supports create, read, write, delete operations with block visualization.
    """
    
    def __init__(self, total_blocks: int = 100, block_size: int = 4):
        """
        Initialize file system.
        
        Args:
            total_blocks: Total number of disk blocks
            block_size: Size of each block in KB
        """
        self.total_blocks = total_blocks
        self.block_size = block_size
        self.total_size = total_blocks * block_size  # Total size in KB
        
        # Block allocation bitmap (True = occupied, False = free)
        self.blocks: List[bool] = [False] * total_blocks
        
        # File entries (path -> FileSystemEntry)
        self.files: Dict[str, FileSystemEntry] = {}
        
        # Inode counter
        self.next_inode = 1
        
        # Current time for timestamps
        self.current_time = 0
        
        # Explanations
        self.explanations: List[str] = []
        
        # Create root directory
        self.files["/"] = FileSystemEntry(
            name="/",
            type="directory",
            size=0,
            created_at=0,
            modified_at=0,
            inode=0
        )
    
    def create_file(self, path: str, size: int = 0) -> Tuple[bool, str]:
        """
        Create a new file.
        
        Args:
            path: File path
            size: File size in KB
            
        Returns:
            (success, message)
        """
        # Check if file already exists
        if path in self.files:
            msg = f"File '{path}' already exists"
            self._add_explanation(f"❌ {msg}")
            return False, msg
        
        # Calculate blocks needed
        blocks_needed = (size + self.block_size - 1) // self.block_size if size > 0 else 0
        
        # Allocate blocks
        allocated_blocks = self._allocate_blocks(blocks_needed)
        
        if len(allocated_blocks) < blocks_needed:
            msg = f"Not enough space to create '{path}' (needs {blocks_needed} blocks, only {len(allocated_blocks)} available)"
            self._add_explanation(f"❌ {msg}")
            # Free allocated blocks
            for block in allocated_blocks:
                self.blocks[block] = False
            return False, msg
        
        # Create file entry
        file_entry = FileSystemEntry(
            name=path.split("/")[-1],
            type="file",
            size=size,
            blocks=allocated_blocks,
            created_at=self.current_time,
            modified_at=self.current_time,
            parent="/".join(path.split("/")[:-1]) or "/",
            inode=self.next_inode
        )
        
        self.next_inode += 1
        self.files[path] = file_entry
        
        self._add_explanation(
            f"✅ Created file '{path}' ({size}KB) "
            f"using {len(allocated_blocks)} blocks: {allocated_blocks}"
        )
        
        return True, f"File '{path}' created successfully"
    
    def create_directory(self, path: str) -> Tuple[bool, str]:
        """
        Create a new directory.
        
        Args:
            path: Directory path
            
        Returns:
            (success, message)
        """
        if path in self.files:
            msg = f"Directory '{path}' already exists"
            self._add_explanation(f"❌ {msg}")
            return False, msg
        
        dir_entry = FileSystemEntry(
            name=path.split("/")[-1],
            type="directory",
            size=0,
            created_at=self.current_time,
            modified_at=self.current_time,
            parent="/".join(path.split("/")[:-1]) or "/",
            inode=self.next_inode
        )
        
        self.next_inode += 1
        self.files[path] = dir_entry
        
        self._add_explanation(f"✅ Created directory '{path}'")
        
        return True, f"Directory '{path}' created successfully"
    
    def read_file(self, path: str) -> Tuple[bool, str, Optional[FileSystemEntry]]:
        """
        Read a file.
        
        Args:
            path: File path
            
        Returns:
            (success, message, file_entry)
        """
        if path not in self.files:
            msg = f"File '{path}' not found"
            self._add_explanation(f"❌ {msg}")
            return False, msg, None
        
        file_entry = self.files[path]
        
        if file_entry.type != "file":
            msg = f"'{path}' is a directory, not a file"
            self._add_explanation(f"❌ {msg}")
            return False, msg, None
        
        self._add_explanation(
            f"📖 Read file '{path}' ({file_entry.size}KB) from blocks {file_entry.blocks}"
        )
        
        return True, f"File '{path}' read successfully", file_entry
    
    def write_file(self, path: str, new_size: int) -> Tuple[bool, str]:
        """
        Write to a file (modify size and reallocate blocks if needed).
        
        Args:
            path: File path
            new_size: New file size in KB
            
        Returns:
            (success, message)
        """
        if path not in self.files:
            msg = f"File '{path}' not found"
            self._add_explanation(f"❌ {msg}")
            return False, msg
        
        file_entry = self.files[path]
        
        if file_entry.type != "file":
            msg = f"'{path}' is a directory, cannot write"
            self._add_explanation(f"❌ {msg}")
            return False, msg
        
        old_size = file_entry.size
        blocks_needed = (new_size + self.block_size - 1) // self.block_size if new_size > 0 else 0
        old_blocks = len(file_entry.blocks)
        
        # Free old blocks
        for block in file_entry.blocks:
            self.blocks[block] = False
        
        # Allocate new blocks
        new_blocks = self._allocate_blocks(blocks_needed)
        
        if len(new_blocks) < blocks_needed:
            msg = f"Not enough space to write '{path}' (needs {blocks_needed} blocks)"
            self._add_explanation(f"❌ {msg}")
            # Restore old blocks as much as possible
            file_entry.blocks = self._allocate_blocks(old_blocks)
            for block in file_entry.blocks:
                self.blocks[block] = True
            return False, msg
        
        # Update file entry
        file_entry.size = new_size
        file_entry.blocks = new_blocks
        file_entry.modified_at = self.current_time
        
        self._add_explanation(
            f"✏️ Wrote to file '{path}': {old_size}KB → {new_size}KB, "
            f"blocks: {new_blocks}"
        )
        
        return True, f"File '{path}' written successfully"
    
    def delete_file(self, path: str) -> Tuple[bool, str]:
        """
        Delete a file or directory.
        
        Args:
            path: File/directory path
            
        Returns:
            (success, message)
        """
        if path not in self.files:
            msg = f"'{path}' not found"
            self._add_explanation(f"❌ {msg}")
            return False, msg
        
        if path == "/":
            msg = "Cannot delete root directory"
            self._add_explanation(f"❌ {msg}")
            return False, msg
        
        file_entry = self.files[path]
        
        # If directory, check if empty
        if file_entry.type == "directory":
            # Check for children
            has_children = any(
                f.parent == path for f in self.files.values()
            )
            if has_children:
                msg = f"Directory '{path}' is not empty"
                self._add_explanation(f"❌ {msg}")
                return False, msg
        
        # Free blocks if it's a file
        if file_entry.type == "file":
            for block in file_entry.blocks:
                self.blocks[block] = False
            
            self._add_explanation(
                f"🗑️ Deleted file '{path}', freed {len(file_entry.blocks)} blocks"
            )
        else:
            self._add_explanation(f"🗑️ Deleted directory '{path}'")
        
        # Remove from files dict
        del self.files[path]
        
        return True, f"'{path}' deleted successfully"
    
    def _allocate_blocks(self, count: int) -> List[int]:
        """Allocate contiguous or scattered blocks"""
        allocated = []
        
        for i in range(self.total_blocks):
            if not self.blocks[i]:
                self.blocks[i] = True
                allocated.append(i)
                
                if len(allocated) == count:
                    break
        
        return allocated
    
    def get_free_blocks(self) -> int:
        """Get number of free blocks"""
        return sum(1 for occupied in self.blocks if not occupied)
    
    def get_used_blocks(self) -> int:
        """Get number of used blocks"""
        return sum(1 for occupied in self.blocks if occupied)
    
    def list_directory(self, path: str = "/") -> List[FileSystemEntry]:
        """List contents of a directory"""
        if path not in self.files:
            return []
        
        if self.files[path].type != "directory":
            return []
        
        # Get all entries where parent is this directory
        contents = [
            entry for entry_path, entry in self.files.items()
            if entry.parent == path
        ]
        
        return contents
    
    def get_state(self) -> Dict:
        """Get file system state for visualization"""
        return {
            "total_blocks": self.total_blocks,
            "block_size": self.block_size,
            "total_size": self.total_size,
            "free_blocks": self.get_free_blocks(),
            "used_blocks": self.get_used_blocks(),
            "blocks": self.blocks.copy(),
            "files": {
                path: {
                    "name": entry.name,
                    "type": entry.type,
                    "size": entry.size,
                    "blocks": entry.blocks,
                    "created_at": entry.created_at,
                    "modified_at": entry.modified_at,
                    "parent": entry.parent,
                    "inode": entry.inode
                }
                for path, entry in self.files.items()
            },
            "explanations": self.explanations
        }
    
    def _add_explanation(self, text: str):
        """Add educational explanation"""
        self.explanations.append(f"[t={self.current_time}] {text}")
