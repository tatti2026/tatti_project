import { useCallback, useEffect, useMemo, useState } from 'react'
import { type FileError, type FileRejection, useDropzone } from 'react-dropzone'

interface FileWithPreview extends File {
  preview?: string
  errors: readonly FileError[]
}

type UseFileUploadOptions = {
  /**
   * Backend API endpoint to upload files to.
   * e.g. '/api/uploads'
   */
  uploadUrl?: string
  /**
   * Allowed MIME types for each file upload (e.g `image/png`, `text/html`, etc). Wildcards are also supported (e.g `image/*`).
   * Defaults to allowing uploading of all MIME types.
   */
  allowedMimeTypes?: string[]
  /**
   * Maximum upload size of each file allowed in bytes. (e.g 1000 bytes = 1 KB)
   */
  maxFileSize?: number
  /**
   * Maximum number of files allowed per upload.
   */
  maxFiles?: number
  /**
   * Additional headers to include in the upload request.
   */
  headers?: Record<string, string>
}

type UseFileUploadReturn = ReturnType<typeof useFileUpload>

const useFileUpload = (options: UseFileUploadOptions) => {
  const {
    uploadUrl,
    allowedMimeTypes = [],
    maxFileSize = Number.POSITIVE_INFINITY,
    maxFiles = 1,
    headers = {},
  } = options

  const [files, setFiles] = useState<FileWithPreview[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [errors, setErrors] = useState<{ name: string; message: string }[]>([])
  const [successes, setSuccesses] = useState<string[]>([])

  const isSuccess = useMemo(() => {
    if (errors.length === 0 && successes.length === 0) {
      return false
    }
    if (errors.length === 0 && successes.length === files.length) {
      return true
    }
    return false
  }, [errors.length, successes.length, files.length])

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      const validFiles = acceptedFiles
        .filter((file) => !files.find((x) => x.name === file.name))
        .map((file) => {
          ;(file as FileWithPreview).preview = URL.createObjectURL(file)
          ;(file as FileWithPreview).errors = []
          return file as FileWithPreview
        })

      const invalidFiles = fileRejections.map(({ file, errors }) => {
        ;(file as FileWithPreview).preview = URL.createObjectURL(file)
        ;(file as FileWithPreview).errors = errors
        return file as FileWithPreview
      })

      const newFiles = [...files, ...validFiles, ...invalidFiles]
      setFiles(newFiles)
    },
    [files, setFiles]
  )

  const dropzoneProps = useDropzone({
    onDrop,
    noClick: true,
    accept: allowedMimeTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxSize: maxFileSize,
    maxFiles: maxFiles,
    multiple: maxFiles !== 1,
  })

  const onUpload = useCallback(async () => {
    if (!uploadUrl) {
      // No upload URL configured — mark all as successful (preview-only mode)
      setSuccesses(files.map(f => f.name))
      return
    }

    setLoading(true)

    const filesWithErrors = errors.map((x) => x.name)
    const filesToUpload =
      filesWithErrors.length > 0
        ? [
            ...files.filter((f) => filesWithErrors.includes(f.name)),
            ...files.filter((f) => !successes.includes(f.name)),
          ]
        : files

    const token = localStorage.getItem('tatti_token') || sessionStorage.getItem('tatti_token')
    const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}

    const responses = await Promise.all(
      filesToUpload.map(async (file) => {
        try {
          const formData = new FormData()
          formData.append('file', file)
          const response = await fetch(uploadUrl, {
            method: 'POST',
            headers: { ...authHeaders, ...headers },
            body: formData,
          })
          if (!response.ok) {
            const err = await response.json().catch(() => ({ message: 'Upload failed' }))
            return { name: file.name, message: err.message || 'Upload failed' }
          }
          return { name: file.name, message: undefined }
        } catch (err: any) {
          return { name: file.name, message: err?.message || 'Upload failed' }
        }
      })
    )

    const responseErrors = responses.filter((x) => x.message !== undefined)
    setErrors(responseErrors as { name: string; message: string }[])

    const responseSuccesses = responses.filter((x) => x.message === undefined)
    const newSuccesses = Array.from(
      new Set([...successes, ...responseSuccesses.map((x) => x.name)])
    )
    setSuccesses(newSuccesses)

    setLoading(false)
  }, [files, uploadUrl, errors, successes, headers])

  useEffect(() => {
    if (files.length === 0) {
      setErrors([])
    }

    if (files.length <= maxFiles) {
      let changed = false
      const newFiles = files.map((file) => {
        if (file.errors.some((e) => e.code === 'too-many-files')) {
          file.errors = file.errors.filter((e) => e.code !== 'too-many-files')
          changed = true
        }
        return file
      })
      if (changed) {
        setFiles(newFiles)
      }
    }
  }, [files.length, setFiles, maxFiles])

  return {
    files,
    setFiles,
    successes,
    isSuccess,
    loading,
    errors,
    setErrors,
    onUpload,
    maxFileSize: maxFileSize,
    maxFiles: maxFiles,
    allowedMimeTypes,
    ...dropzoneProps,
  }
}

export { useFileUpload, type UseFileUploadOptions, type UseFileUploadReturn }
