#define _POSIX_C_SOURCE 200809L

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <signal.h>
#include <unistd.h>
#include "scheduler.h"
#include "timer.h"
#include "monitor.h"
#include "shell.h"

static void sigint_handler(int signum) {
    (void)signum;
    // Stop scheduler and clean up on Ctrl+C
    scheduler_stop();
    printf("\nInterrumpido. Procesos terminados.\n");
    _exit(0);
}

int main(void) {
    signal(SIGPIPE, SIG_IGN);

    struct sigaction sa;
    memset(&sa, 0, sizeof(sa));
    sa.sa_handler = sigint_handler;
    sigemptyset(&sa.sa_mask);
    sigaction(SIGINT, &sa, NULL);

    scheduler_init();
    scheduler_install_sigchld();

    // Default time slice
    timer_set_slice(500);

    // Enable monitor by default — the socket connects lazily on first event,
    // so if the bridge isn't running yet it just drops events silently until
    // the bridge arrives.
    monitor_init(MONITOR_SOCKET_PATH);
    monitor_set_enabled(1);

    shell_run();

    return 0;
}
