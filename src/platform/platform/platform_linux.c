#include "platform.h"
#include <sys/ptrace.h>
#include <sys/user.h>
#include <sys/wait.h>
#include <signal.h>
#include <stdio.h>

int platform_trace_child(void) {
    return ptrace(PTRACE_TRACEME, 0, NULL, NULL);
}

int platform_stop_process(pid_t pid) {
    return kill(pid, SIGSTOP);
}

int platform_resume_process(pid_t pid) {
    return kill(pid, SIGCONT);
}

int platform_detach(pid_t pid) {
    return ptrace(PTRACE_DETACH, pid, NULL, NULL);
}

int platform_get_registers(pid_t pid, cpu_context_t *ctx) {
    struct user_regs_struct regs;
    if (ptrace(PTRACE_GETREGS, pid, NULL, &regs) == -1) {
        return -1;
    }
    ctx->program_counter = regs.rip;
    ctx->stack_pointer   = regs.rsp;
    ctx->general_regs[0] = regs.rax;
    ctx->general_regs[1] = regs.rbx;
    ctx->general_regs[2] = regs.rcx;
    ctx->general_regs[3] = regs.rdx;
    ctx->general_regs[4] = regs.rsi;
    ctx->general_regs[5] = regs.rdi;
    ctx->general_regs[6] = regs.rbp;
    ctx->general_regs[7] = regs.r8;
    ctx->general_regs[8] = regs.r9;
    ctx->general_regs[9] = regs.r10;
    ctx->general_regs[10] = regs.r11;
    ctx->general_regs[11] = regs.r12;
    ctx->general_regs[12] = regs.r13;
    ctx->general_regs[13] = regs.r14;
    ctx->general_regs[14] = regs.r15;
    ctx->general_regs[15] = regs.orig_rax;
    return 0;
}

int platform_sample_registers(pid_t pid, cpu_context_t *ctx) {
    if (ptrace(PTRACE_ATTACH, pid, NULL, NULL) == -1) {
        return -1;
    }

    int status;
    if (waitpid(pid, &status, WUNTRACED) < 0) {
        ptrace(PTRACE_DETACH, pid, NULL, NULL);
        return -1;
    }

    int rc = platform_get_registers(pid, ctx);

    // Detach and leave the tracee stopped (SIGSTOP delivered on detach).
    ptrace(PTRACE_DETACH, pid, NULL, (void *)(long)SIGSTOP);
    return rc;
}

int platform_registers_available(void) {
    return 1;
}

int platform_uses_ptrace(void) {
    return 1;
}
