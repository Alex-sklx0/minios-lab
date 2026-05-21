#include "platform.h"
#include <signal.h>
#include <stdio.h>

// On macOS with SIP, ptrace can't read registers (task_for_pid blocked).
// We skip PT_TRACE_ME entirely and use only SIGSTOP/SIGCONT.

int platform_trace_child(void) {
    return 0; // No-op: don't trace on macOS
}

int platform_stop_process(pid_t pid) {
    return kill(pid, SIGSTOP);
}

int platform_resume_process(pid_t pid) {
    return kill(pid, SIGCONT);
}

int platform_detach(pid_t pid) {
    (void)pid;
    return 0; // No-op: nothing to detach
}

int platform_get_registers(pid_t pid, cpu_context_t *ctx) {
    (void)pid;
    memset(ctx, 0, sizeof(*ctx));
    return -1; // Not available on macOS with SIP
}

int platform_sample_registers(pid_t pid, cpu_context_t *ctx) {
    (void)pid;
    (void)ctx;
    return -1; // Not available on macOS with SIP
}

int platform_registers_available(void) {
    return 0;
}

int platform_uses_ptrace(void) {
    return 0;
}
