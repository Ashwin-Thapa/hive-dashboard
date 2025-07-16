#include <stdio.h>
#include <string.h>
#define max 50

int top = -1, stack[max];

void push(char ch)
{
    if (top == max)
    {
        printf("Stack full");
    }
    else
    {
        stack[top++] = ch;
    }
}
void pop()
{
    printf("%c", stack[--top]);
}

void main()
{
    int i, len;
    char Str[max];
    printf("Enter string: ");
    scanf("%s", Str);
    len = strlen(Str);

    for (i = 0; i < len; i++)
    {
        push(Str[i]);
    }

    for (i = 0; i < len; i++)
    {
        pop();
    }
}