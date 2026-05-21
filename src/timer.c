#define _POSIX_C_SOURCE 200809L

#include "timer.h"
#include <signal.h>
#include <sys/time.h>
#include <string.h>

static int current_slice_ms = 500;

void timer_init(int slice_ms, void (*tick_handler)(int)) {
    current_slice_ms = slice_ms;

    struct sigaction sa;
    memset(&sa, 0, sizeof(sa));
    sa.sa_handler = tick_handler;
    sa.sa_flags = SA_RESTART;
    sigemptyset(&sa.sa_mask);
    sigaction(SIGALRM, &sa, NULL);
}

void timer_set_slice(int slice_ms) {
    current_slice_ms = slice_ms;
}

int timer_get_slice(void) {
    return current_slice_ms;
}

void timer_start(void) {
    struct itimerval timer;
    memset(&timer, 0, sizeof(timer));
    timer.it_value.tv_sec = current_slice_ms / 1000;
    timer.it_value.tv_usec = (current_slice_ms % 1000) * 1000;
    timer.it_interval.tv_sec = current_slice_ms / 1000;
    timer.it_interval.tv_usec = (current_slice_ms % 1000) * 1000;
    setitimer(ITIMER_REAL, &timer, NULL);
}

void timer_stop(void) {
    struct itimerval timer;
    memset(&timer, 0, sizeof(timer));
    setitimer(ITIMER_REAL, &timer, NULL);
}
