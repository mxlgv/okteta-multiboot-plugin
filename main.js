/*
Copyright © 2023, Maxim Logaev <maximlogaev2001ezro@gmail.com>

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 2
of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program; If not, see <http://www.gnu.org/licenses/>.
*/

/* The magic field should contain this */
const MULTIBOOT_HEADER_MAGIC = 0x1BADB002

/* How many bytes from the start of the file we search for the header. */
const MULTIBOOT_SEARCH = 0x8192
const MULTIBOOT_HEADER_ALIGN = 4

/* Flags set in the ’flags’ member of the multiboot header. */
const MULTIBOOT_PAGE_ALIGN  = 0x00000001 // Align all boot modules on i386 page (4KB) boundaries.
const MULTIBOOT_MEMORY_INFO = 0x00000002 // Must pass memory information to OS.
const MULTIBOOT_VIDEO_MODE  = 0x00000004 // Must pass video information to OS.
const MULTIBOOT_AOUT_KLUDGE = 0x00010000 // This flag indicates the use of the address fields in the header.

const VALID_FLAGS = MULTIBOOT_PAGE_ALIGN & MULTIBOOT_MEMORY_INFO & MULTIBOOT_VIDEO_MODE & MULTIBOOT_AOUT_KLUDGE

function validate_header() 
{
    if (this.magic.value != MULTIBOOT_HEADER_MAGIC) {
        this.validationError = "Bad header magic";
        return false;
    }

    if (this.flags.value & VALID_FLAGS) {
        this.validationError = "Bad flags"
        return false;
    }

    if ((this.magic.value + this.flags.value + this.checksum.value != Math.pow(2, 32))) {
        this.validationError = "Bad checksum";
        return false;
    }
/*
    if (this.flags.value & MULTIBOOT_AOUT_KLUDGE) {
        TODO: Address validation is currently not possible because Okteta does not provide an API 
        for getting the current position in a file.
    }
*/
    if (this.flags.value & MULTIBOOT_VIDEO_MODE) {
        if (this.mode_type.value != 0 && this.mode_type.value != 1) {
            this.validationError = "Bad mode_type (Only '1' or '0' allowed)";
        }
    }

    return true;
}

function init() 
{
    const multiboot_flags = {
        'PAGE_ALIGN'  : MULTIBOOT_PAGE_ALIGN, 
        'MEMORY_INFO' : MULTIBOOT_MEMORY_INFO, 
        'VIDEO_MODE'  : MULTIBOOT_VIDEO_MODE, 
        'AOUT_KLUDGE' : MULTIBOOT_AOUT_KLUDGE 
    };

    const mode_type_enum = {
        "Linear graphics mode"  : 0,
        "EGA-standard text mode": 1
    };

    /* The Multiboot header. */
    var multiboot_header = struct({
        magic           : uint32(), // Must be MULTIBOOT_MAGIC - see above.
        flags           : flags('Feature flags', uint32(), multiboot_flags), // Feature flags.
        checksum        : uint32(), // The above fields plus this one must equal 0 mod 2^32.

        /* These are only valid if MULTIBOOT_AOUT_KLUDGE is set. */
        header_addr     : uint32(), // Header physical address.
        load_addr       : uint32(), // Physical address of the beginning of the text segment.
        load_end_addr   : uint32(), // Physical address of the end of the data segment. 
        bss_end_addr    : uint32(), // Physical address of the end of the bss segment.
        entry_addr      : uint32(), // Physical address of the kernel entry point.
        
        /* These are only valid if MULTIBOOT_VIDEO_MODE is set. */
        mode_type       : enumeration("mode_type", uint32(), mode_type_enum), // Mode type.
        width           : uint32(), // Number of the columns.
        height          : uint32(), // Number of the lines.
        depth           : uint32()  // Number of bits per pixel in a graphics mode, and zero in a text mode.
    });

    multiboot_header.byteOrder = "little-endian";
    multiboot_header.validationFunc = validate_header;
    multiboot_header.name = "Multiboot";

    return multiboot_header;
}
