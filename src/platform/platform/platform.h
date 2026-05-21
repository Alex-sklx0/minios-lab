#ifndef PLATFORM_H
#define PLATFORM_H

#include <sys/types.h>
#include <stdint.h>
#include <string.h>

#define NUM_GENERAL_REGS 16

typedef struct {
    uint64_t program_counter;
    uint64_t stack_pointer;
    uint64_t general_regs[NUM_GENERAL_REGS];
} cpu_context_t;

// Called by the child process before exec to enable tracing.
// On macOS this is a no-op since we can't read registers.
int platform_trace_child(void);

// Stop a running process (SIGSTOP)
int platform_stop_process(pid_t pid);

// Resume a stopped process (SIGCONT)
int platform_resume_process(pid_t pid);

// Detach tracing from a process (Linux only, no-op on macOS)
int platform_detach(pid_t pid);

// Capture CPU registers into ctx. Returns 0 on success, -1 if not available.
int platform_get_registers(pid_t pid, cpu_context_t *ctx);

// Sample registers of a stopped process that is not currently being traced.
// On Linux: PTRACE_ATTACH, GETREGS, DETACH (leaving the tracee stopped).
// On macOS: no-op, returns -1. Returns 0 on success.
int platform_sample_registers(pid_t pid, cpu_context_t *ctx);

// Returns 1 if register reading is supported on this platform, 0 otherwise
int platform_registers_available(void);

// Returns 1 if ptrace tracing is used on this platform
int platform_uses_ptrace(void);

#endif
