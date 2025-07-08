type ToastProps = {
  title: string
  description?: string
}

export function toast(props: ToastProps) {
  // In a real app, this would be more sophisticated
  alert(`${props.title}\n${props.description || ""}`)
}
